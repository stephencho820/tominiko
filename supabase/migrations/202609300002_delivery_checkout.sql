-- Korean checkout, reusable customer addresses and centrally managed delivery policy.
alter type public.fulfillment_type add value if not exists 'shipping';
alter type public.fulfillment_type add value if not exists 'local_delivery';
alter table public.profiles add column if not exists phone text;

create table if not exists public.delivery_settings (
  id boolean primary key default true check (id), free_shipping_threshold integer not null default 50000 check (free_shipping_threshold >= 0),
  standard_shipping_fee integer not null default 3000 check (standard_shipping_fee >= 0), local_delivery_enabled boolean not null default true,
  local_delivery_days integer[] not null default '{2,4,6}', local_delivery_message text not null default '광교 이웃에게는 Casa di Stefano가 직접 배송해 드려요.', updated_at timestamptz not null default now()
);
insert into public.delivery_settings(id) values(true) on conflict do nothing;
create table if not exists public.local_delivery_zones (
  id uuid primary key default gen_random_uuid(), name text not null, zone_type text not null check(zone_type in ('postal_prefix','postal_range','district')),
  zone_value text not null, enabled boolean not null default true, created_at timestamptz not null default now(), unique(zone_type,zone_value)
);
create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, label text not null default '집',
  recipient_name text not null, phone text not null, zonecode text not null, road_address text not null, jibun_address text,
  detail_address text not null, building_name text, is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists user_addresses_one_default on public.user_addresses(user_id) where is_default;
alter table public.delivery_settings enable row level security; alter table public.local_delivery_zones enable row level security; alter table public.user_addresses enable row level security;
create policy "delivery settings public read" on public.delivery_settings for select using(true);
create policy "admins manage delivery settings" on public.delivery_settings for all using(public.is_admin()) with check(public.is_admin());
create policy "zones public read" on public.local_delivery_zones for select using(true);
create policy "admins manage zones" on public.local_delivery_zones for all using(public.is_admin()) with check(public.is_admin());
create policy "users manage own addresses" on public.user_addresses for all using(user_id=auth.uid()) with check(user_id=auth.uid());

alter table public.orders
  add column if not exists delivery_method text,
  add column if not exists recipient_name text, add column if not exists recipient_phone text,
  add column if not exists shipping_zonecode text, add column if not exists shipping_road_address text,
  add column if not exists shipping_jibun_address text, add column if not exists shipping_detail_address text,
  add column if not exists shipping_building_name text, add column if not exists shipping_bname text,
  add column if not exists shipping_memo_type text, add column if not exists shipping_memo_text text,
  add column if not exists product_subtotal integer, add column if not exists discount_amount integer not null default 0,
  add column if not exists final_amount integer;
update public.orders set delivery_method=case when fulfillment_type='pickup' then 'pickup' else 'shipping' end,
 recipient_name=customer_name,recipient_phone=phone,shipping_zonecode=postal_code,shipping_road_address=address,
 shipping_detail_address=address_detail,shipping_memo_text=delivery_message,product_subtotal=subtotal,final_amount=total where delivery_method is null;
alter table public.orders alter column delivery_method set not null;
alter table public.orders add constraint orders_delivery_method_check check(delivery_method in ('shipping','local_delivery','pickup')) not valid;

-- Only structured Daum address fields are compared: postcode prefix/range or exact bname/district token.
create or replace function public.local_delivery_eligible(p_zonecode text,p_bname text,p_road text,p_jibun text) returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce((select local_delivery_enabled from delivery_settings where id=true),true) and exists(
 select 1 from local_delivery_zones z where z.enabled and (
  (z.zone_type='postal_prefix' and regexp_replace(coalesce(p_zonecode,''),'\D','','g') like regexp_replace(z.zone_value,'\D','','g')||'%') or
  (z.zone_type='postal_range' and regexp_replace(coalesce(p_zonecode,''),'\D','','g')::integer between split_part(z.zone_value,'-',1)::integer and split_part(z.zone_value,'-',2)::integer) or
  (z.zone_type='district' and z.zone_value=p_bname)
 )); $$;

drop function if exists public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,jsonb);
create or replace function public.create_pending_order(
 p_client_reference uuid,p_guest_token_hash text,p_customer_name text,p_email text,p_phone text,p_delivery_method text,
 p_zonecode text,p_road_address text,p_jibun_address text,p_detail_address text,p_building_name text,p_bname text,p_memo_type text,p_memo_text text,p_items jsonb
) returns table(order_id uuid,order_number text,total integer,order_name text,token_matches boolean)
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_number text; v_subtotal integer; v_shipping integer; v_settings delivery_settings%rowtype; v_existing orders%rowtype; v_count integer; v_name text;
begin
 select * into v_existing from orders where client_reference=p_client_reference;
 if found then return query select v_existing.id,v_existing.order_number,v_existing.total,(select oi.product_name from order_items oi where oi.order_id=v_existing.id limit 1),v_existing.guest_access_token_hash=p_guest_token_hash; return; end if;
 if p_delivery_method not in ('shipping','local_delivery','pickup') then raise exception 'invalid fulfillment'; end if;
 if p_delivery_method<>'pickup' and (nullif(p_zonecode,'') is null or nullif(p_road_address,'') is null or nullif(p_detail_address,'') is null) then raise exception 'address required'; end if;
 if p_delivery_method='local_delivery' and not local_delivery_eligible(p_zonecode,p_bname,p_road_address,p_jibun_address) then raise exception 'local delivery unavailable'; end if;
 create temporary table if not exists pg_temp.checkout_items(product_id uuid,product_name text,weight text,grind text,quantity integer,unit_price integer,line_total integer) on commit drop; truncate pg_temp.checkout_items;
 insert into pg_temp.checkout_items select p.id,p.name,i->>'weight',i->>'grind',(i->>'quantity')::integer,case i->>'weight' when '150g' then p.price_150g when '400g' then p.price_400g end,(case i->>'weight' when '150g' then p.price_150g when '400g' then p.price_400g end)*(i->>'quantity')::integer from jsonb_array_elements(p_items)i join products p on p.id=(i->>'product_id')::uuid and p.active where i->>'weight' in('150g','400g') and i->>'grind' in('Whole Bean','Filter','Espresso') and (i->>'quantity')::integer between 1 and 20;
 if (select count(*) from pg_temp.checkout_items)<>jsonb_array_length(p_items) then raise exception 'unavailable items'; end if;
 perform 1 from products p where p.id in(select distinct c.product_id from pg_temp.checkout_items c) order by p.id for update;
 if exists(select 1 from products p join(select product_id,sum(quantity) quantity from pg_temp.checkout_items group by product_id)q on q.product_id=p.id where q.quantity>p.stock_quantity) then raise exception 'insufficient stock'; end if;
 select sum(line_total),min(product_name),count(*) into v_subtotal,v_name,v_count from pg_temp.checkout_items; select * into v_settings from delivery_settings where id=true;
 v_shipping:=case when p_delivery_method='shipping' and v_subtotal<v_settings.free_shipping_threshold then v_settings.standard_shipping_fee else 0 end;
 v_id:=gen_random_uuid(); v_number:='TM-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(v_id::text,'-',''),1,8));
 insert into orders(id,order_number,user_id,customer_name,email,phone,fulfillment_type,postal_code,address,address_detail,delivery_message,subtotal,shipping_fee,total,payment_status,order_status,client_reference,guest_access_token_hash,delivery_method,recipient_name,recipient_phone,shipping_zonecode,shipping_road_address,shipping_jibun_address,shipping_detail_address,shipping_building_name,shipping_bname,shipping_memo_type,shipping_memo_text,product_subtotal,discount_amount,final_amount)
 values(v_id,v_number,auth.uid(),p_customer_name,p_email,p_phone,case when p_delivery_method='pickup' then 'pickup'::fulfillment_type else 'delivery'::fulfillment_type end,p_zonecode,p_road_address,p_detail_address,coalesce(nullif(p_memo_text,''),p_memo_type),v_subtotal,v_shipping,v_subtotal+v_shipping,'pending','new',p_client_reference,p_guest_token_hash,p_delivery_method,p_customer_name,p_phone,p_zonecode,p_road_address,p_jibun_address,p_detail_address,p_building_name,p_bname,p_memo_type,p_memo_text,v_subtotal,0,v_subtotal+v_shipping);
 insert into order_items(order_id,product_id,product_name,weight,grind,quantity,unit_price,subtotal) select v_id,product_id,product_name,weight,grind,quantity,unit_price,line_total from pg_temp.checkout_items;
 return query select v_id,v_number,v_subtotal+v_shipping,v_name||case when v_count>1 then ' 외 '||(v_count-1)::text||'건' else '' end,true;
end $$;
revoke all on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) to anon,authenticated;
