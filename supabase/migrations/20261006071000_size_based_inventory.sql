begin;

-- Preserve original inventory before conservative conversion. Never sum grind stocks.
create table public.product_inventory_backup_20261006 as
select id as product_id, variants, stock_quantity, status, active, now() as backed_up_at from public.products;
alter table public.product_inventory_backup_20261006 enable row level security;
revoke all on public.product_inventory_backup_20261006 from anon, authenticated;

-- Use the smallest valid positive stock per size, never the sum across grinds.
-- Quick Stock Edit historically updated only stock_quantity, so zero/invalid
-- variant stocks cannot erase a positive total. Split that total evenly when
-- neither size has a positive reference, assigning the odd unit to 150g.
with legacy_stock as (
 select p.id, greatest(p.stock_quantity,0) as total,
  min((v->>'stock')::bigint) filter (where replace(lower(v->>'size'),' ','')='150g') as stock150,
  min((v->>'stock')::bigint) filter (where replace(lower(v->>'size'),' ','')='400g') as stock400
 from public.products p left join lateral (
  select value as v from jsonb_array_elements(p.variants)
  where value->>'stock' ~ '^[0-9]{1,10}$'
   and case when value->>'stock' ~ '^[0-9]{1,10}$' then (value->>'stock')::bigint between 1 and 2147483647 else false end
 ) valid on true
 group by p.id
), allocation150 as (
 select *, case when stock150 is null and stock400 is null then total/2+total%2
  else least(coalesce(stock150,0),total) end as allocated150 from legacy_stock
), allocations as (
 select *, case when stock150 is null and stock400 is null then total/2
  else least(coalesce(stock400,0),total-allocated150) end as allocated400 from allocation150
)
update public.products p set variants = (
 select jsonb_agg(jsonb_build_object(
  'id', size, 'size', size,
  'price', case size when '150g' then greatest(coalesce(p.price_150g_original,p.price_150g),p.price_150g,1) else greatest(coalesce(p.price_400g_original,p.price_400g),p.price_400g,1) end,
  'salePrice', case size when '150g' then greatest(p.price_150g,1) else greatest(p.price_400g,1) end,
  'stock', case size when '150g' then a.allocated150 else a.allocated400 end,
  'available', coalesce((select bool_and(coalesce(v->'available' = 'true'::jsonb,false)) from jsonb_array_elements(p.variants) v where replace(lower(v->>'size'),' ','')=size),false)
 ) order by size) from unnest(array['150g','400g']) size
) from allocations a where a.id=p.id;
alter table public.order_items add column if not exists variant_id text;
update public.order_items set variant_id=weight where weight in ('150g','400g');
update public.order_items set grind='Filter' where grind='Pour Over';

-- Serialize all product writes before row locks, so changing today's roast is atomic
-- even when two admins select different products concurrently.
create function public.serialize_product_inventory_writes() returns trigger
language plpgsql set search_path=public as $$
begin perform pg_advisory_xact_lock(20261006,710); return null; end $$;
create trigger serialize_product_inventory_writes before insert or update or delete on public.products
for each statement execute function public.serialize_product_inventory_writes();

create function public.enforce_size_inventory() returns trigger
language plpgsql security definer set search_path=public as $$
declare v jsonb; ids text[] := '{}'; sizes text[] := '{}'; total_stock bigint := 0;
begin
 if jsonb_typeof(new.variants) is distinct from 'array' or jsonb_array_length(new.variants) <> 2 then raise exception 'Exactly two size variants required'; end if;
 for v in select value from jsonb_array_elements(new.variants) loop
  if jsonb_typeof(v->'id') is distinct from 'string' or (v->>'id') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'
   or (v->>'size') not in ('150g','400g') or v->>'size' is null
   or v->>'id'=any(ids) or v->>'size'=any(sizes)
   or jsonb_typeof(v->'price') is distinct from 'number' or (v->>'price') !~ '^[0-9]+$' or (v->>'price')::bigint not between 1 and 2147483647
   or jsonb_typeof(v->'stock') is distinct from 'number' or (v->>'stock') !~ '^[0-9]+$' or (v->>'stock')::bigint not between 0 and 2147483647
   or jsonb_typeof(v->'available') is distinct from 'boolean'
   or (v ? 'salePrice' and v->'salePrice' <> 'null'::jsonb and (jsonb_typeof(v->'salePrice') <> 'number' or (v->>'salePrice') !~ '^[0-9]+$' or (v->>'salePrice')::bigint not between 1 and (v->>'price')::bigint))
   or v ? 'grindType' then raise exception 'Invalid size inventory'; end if;
  ids:=array_append(ids,v->>'id'); sizes:=array_append(sizes,v->>'size'); total_stock:=total_stock+(v->>'stock')::bigint;
  if v->>'size'='150g' then new.price_150g_original:=(v->>'price')::integer; new.price_150g:=coalesce((v->>'salePrice')::integer,(v->>'price')::integer);
  else new.price_400g_original:=(v->>'price')::integer; new.price_400g:=coalesce((v->>'salePrice')::integer,(v->>'price')::integer); end if;
 end loop;
 new.stock_quantity:=total_stock; new.sale_price:=null;
 new.active:=new.status in ('active','sold-out');
 if new.status is distinct from 'active' then new.todays_roast:=false; end if;
 if new.todays_roast and (tg_op='INSERT' or not old.todays_roast) then
  update public.products set todays_roast=false where todays_roast and id<>new.id;
 end if;
 return new;
end $$;
-- Clear ineligible selections before choosing the single active roast.
update public.products set todays_roast=false where status is distinct from 'active';
-- Resolve existing multiple selections before the unique index.
with ranked as (select id,row_number() over(order by display_order,id) n from public.products where todays_roast)
update public.products set todays_roast=false where id in(select id from ranked where n>1);
create unique index products_one_todays_roast on public.products(todays_roast) where todays_roast;
create trigger enforce_size_inventory before insert or update on public.products for each row execute function public.enforce_size_inventory();
update public.products set variants=variants;

create or replace function public.create_pending_order(
 p_client_reference uuid,p_guest_token_hash text,p_customer_name text,p_email text,p_phone text,p_delivery_method text,
 p_zonecode text,p_road_address text,p_jibun_address text,p_detail_address text,p_building_name text,p_bname text,p_memo_type text,p_memo_text text,p_items jsonb
) returns table(order_id uuid,order_number text,total integer,order_name text,token_matches boolean)
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_number text; v_subtotal integer; v_shipping integer; v_settings delivery_settings%rowtype; v_existing orders%rowtype; v_count integer; v_name text;
begin
 perform pg_advisory_xact_lock(20261006,710);
 select * into v_existing from orders where client_reference=p_client_reference;
 if found then return query select v_existing.id,v_existing.order_number,v_existing.total,(select oi.product_name from order_items oi where oi.order_id=v_existing.id limit 1),v_existing.guest_access_token_hash=p_guest_token_hash; return; end if;
 if p_delivery_method not in ('shipping','local_delivery','pickup') then raise exception 'invalid fulfillment'; end if;
 if p_delivery_method<>'pickup' and (nullif(p_zonecode,'') is null or nullif(p_road_address,'') is null or nullif(p_detail_address,'') is null) then raise exception 'address required'; end if;
 if p_delivery_method='local_delivery' and not local_delivery_eligible(p_zonecode,p_bname,p_road_address,p_jibun_address) then raise exception 'local delivery unavailable'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'invalid items'; end if;
 perform 1 from products p where p.id in(select (i->>'product_id')::uuid from jsonb_array_elements(p_items)i) order by p.id for update;
 create temporary table if not exists pg_temp.checkout_items(product_id uuid,variant_id text,product_name text,weight text,grind text,quantity integer,unit_price integer,line_total integer) on commit drop; truncate pg_temp.checkout_items;
 insert into pg_temp.checkout_items
 select p.id,v->>'id',p.name,v->>'size',case i->>'grind' when 'Pour Over' then 'Filter' else i->>'grind' end,(i->>'quantity')::integer,
 coalesce((v->>'salePrice')::integer,(v->>'price')::integer),coalesce((v->>'salePrice')::integer,(v->>'price')::integer)*(i->>'quantity')::integer
 from jsonb_array_elements(p_items)i join products p on p.id=(i->>'product_id')::uuid and p.status='active'
 cross join lateral jsonb_array_elements(p.variants)v
 where v->>'id'=i->>'variant_id' and v->>'size'=i->>'weight' and (v->>'available')::boolean
 and i->>'grind' in('Whole Bean','Filter','Pour Over','Espresso') and (i->>'quantity') ~ '^[0-9]+$' and (i->>'quantity')::integer between 1 and 20;
 if (select count(*) from pg_temp.checkout_items)<>jsonb_array_length(p_items) then raise exception 'unavailable items'; end if;
 if exists(select 1 from pg_temp.checkout_items c join products p on p.id=c.product_id cross join lateral jsonb_array_elements(p.variants)v
  where v->>'id'=c.variant_id and (select sum(x.quantity) from pg_temp.checkout_items x where x.product_id=c.product_id and x.variant_id=c.variant_id)>(v->>'stock')::integer) then raise exception 'insufficient stock'; end if;
 select sum(line_total),min(product_name),count(*) into v_subtotal,v_name,v_count from pg_temp.checkout_items; select * into v_settings from delivery_settings where id=true;
 v_shipping:=case when p_delivery_method='shipping' and v_subtotal<v_settings.free_shipping_threshold then v_settings.standard_shipping_fee else 0 end;
 v_id:=gen_random_uuid(); v_number:='TM-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(v_id::text,'-',''),1,8));
 insert into orders(id,order_number,user_id,customer_name,email,phone,fulfillment_type,postal_code,address,address_detail,delivery_message,subtotal,shipping_fee,total,payment_status,order_status,client_reference,guest_access_token_hash,delivery_method,recipient_name,recipient_phone,shipping_zonecode,shipping_road_address,shipping_jibun_address,shipping_detail_address,shipping_building_name,shipping_bname,shipping_memo_type,shipping_memo_text,product_subtotal,discount_amount,final_amount)
 values(v_id,v_number,auth.uid(),p_customer_name,p_email,p_phone,case when p_delivery_method='pickup' then 'pickup'::fulfillment_type else 'delivery'::fulfillment_type end,p_zonecode,p_road_address,p_detail_address,coalesce(nullif(p_memo_text,''),p_memo_type),v_subtotal,v_shipping,v_subtotal+v_shipping,'pending','new',p_client_reference,p_guest_token_hash,p_delivery_method,p_customer_name,p_phone,p_zonecode,p_road_address,p_jibun_address,p_detail_address,p_building_name,p_bname,p_memo_type,p_memo_text,v_subtotal,0,v_subtotal+v_shipping);
 insert into order_items(order_id,product_id,variant_id,product_name,weight,grind,quantity,unit_price,subtotal) select v_id,product_id,variant_id,product_name,weight,grind,quantity,unit_price,line_total from pg_temp.checkout_items;
 return query select v_id,v_number,v_subtotal+v_shipping,v_name||case when v_count>1 then ' 외 '||(v_count-1)::text||'건' else '' end,true;
end $$;
revoke all on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) to anon,authenticated;

create or replace function public.finalize_paid_order(
  p_order_id uuid, p_payment_key text, p_amount integer, p_method text, p_approved_at timestamptz
) returns text language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  perform pg_advisory_xact_lock(20261006,710);
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.total <> p_amount then return 'mismatch'; end if;
  if v_order.payment_status = 'paid' then
    return case when v_order.payment_key = p_payment_key then 'already_paid' else 'mismatch' end;
  end if;
  if v_order.payment_status in ('cancelled', 'refunded') then return 'not_payable'; end if;

  perform 1 from public.products p where p.id in
    (select oi.product_id from public.order_items oi where oi.order_id = p_order_id and oi.product_id is not null)
    order by p.id for update;
  if exists (
    select 1 from (select product_id,variant_id,weight,sum(quantity) quantity from public.order_items where order_id=p_order_id group by product_id,variant_id,weight) q
    left join public.products p on p.id=q.product_id
    left join lateral jsonb_array_elements(p.variants) v on v->>'id'=q.variant_id and v->>'size'=q.weight
    where p.id is null or p.status<>'active' or v is null or not (v->>'available')::boolean or (v->>'stock')::integer<q.quantity
  ) then return 'out_of_stock'; end if;

  update public.products p set variants=(
    select jsonb_agg(v || jsonb_build_object('stock',(v->>'stock')::integer-coalesce((select sum(oi.quantity)::integer from public.order_items oi where oi.order_id=p_order_id and oi.product_id=p.id and oi.variant_id=v->>'id'),0)) order by ordinal)
    from jsonb_array_elements(p.variants) with ordinality as x(v,ordinal)
  ), updated_at=now() where p.id in(select product_id from public.order_items where order_id=p_order_id);
  update public.orders set payment_status = 'paid', order_status = 'confirmed', payment_key = p_payment_key,
    payment_method = p_method, payment_approved_at = p_approved_at, inventory_deducted_at = now(),
    payment_failure_code = null, payment_failure_message = null, updated_at = now() where id = p_order_id;
  return 'paid';
end; $$;


commit;
