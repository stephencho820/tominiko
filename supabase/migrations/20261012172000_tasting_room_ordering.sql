begin;

create table if not exists public.tasting_menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null check (category in ('brewed','espresso','non-coffee','sweet')),
  price integer not null check (price > 0),
  hot_available boolean not null default false,
  iced_available boolean not null default false,
  active boolean not null default true,
  sold_out boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasting_menu_items enable row level security;
drop policy if exists "tasting menu is public" on public.tasting_menu_items;
create policy "tasting menu is public" on public.tasting_menu_items for select using (active = true or private.is_admin());
drop policy if exists "admins manage tasting menu" on public.tasting_menu_items;
create policy "admins manage tasting menu" on public.tasting_menu_items for all using (private.is_admin()) with check (private.is_admin());

alter table public.orders add column if not exists order_source text not null default 'online'
  check (order_source in ('online','tasting_room'));
alter table public.orders add column if not exists table_label text;
alter table public.order_items add column if not exists menu_item_id uuid references public.tasting_menu_items(id) on delete set null;
alter table public.order_items add column if not exists item_kind text not null default 'bean'
  check (item_kind in ('bean','drink','food'));
alter table public.order_items add column if not exists selected_option text;

insert into public.tasting_menu_items(name,description,category,price,hot_available,iced_available,display_order)
select * from (values
 ('Today''s Filter Coffee','오늘 준비된 원두를 가장 잘 보여주는 한 잔','brewed',6000,true,true,10),
 ('Hand Drip','원두를 고르면 한 잔씩 천천히 내려드립니다','brewed',7000,true,true,20),
 ('Coffee Flight','서로 다른 커피를 비교해 보는 테이스팅','brewed',12000,false,false,30),
 ('Espresso','짧고 선명하게','espresso',4500,true,false,40),
 ('Americano','Hot / Ice','espresso',5000,true,true,50),
 ('Caffè Latte','Hot / Ice','espresso',5500,true,true,60),
 ('Chocolate','Hot / Ice','non-coffee',5500,true,true,70),
 ('Seasonal Tea','계절에 따라 달라지는 차','non-coffee',5500,true,true,80),
 ('Today''s Bake','커피와 함께 준비하는 오늘의 디저트','sweet',6500,false,false,90)
) as seed(name,description,category,price,hot_available,iced_available,display_order)
where not exists (select 1 from public.tasting_menu_items);

create or replace function public.create_tasting_room_order(
 p_client_reference uuid,p_guest_token_hash text,p_customer_name text,p_phone text,p_email text,p_table_label text,p_items jsonb
) returns table(order_id uuid,order_number text,total integer,order_name text,token_matches boolean)
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_number text; v_total integer; v_name text; v_count integer; v_existing orders%rowtype;
begin
 perform pg_advisory_xact_lock(20261012,1720);
 select * into v_existing from orders where client_reference=p_client_reference;
 if found then return query select v_existing.id,v_existing.order_number,v_existing.total,(select oi.product_name from order_items oi where oi.order_id=v_existing.id order by oi.id limit 1),v_existing.guest_access_token_hash=p_guest_token_hash; return; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'invalid items'; end if;
 create temporary table if not exists pg_temp.tr_items(kind text,product_id uuid,menu_item_id uuid,variant_id text,name text,weight text,grind text,selected_option text,quantity integer,unit_price integer,line_total integer) on commit drop;
 truncate pg_temp.tr_items;
 insert into pg_temp.tr_items
 select 'menu',null,m.id,null,m.name,'Cup',coalesce(nullif(i->>'option',''),'Standard'),coalesce(nullif(i->>'option',''),'Standard'),(i->>'quantity')::integer,m.price,m.price*(i->>'quantity')::integer
 from jsonb_array_elements(p_items)i join tasting_menu_items m on i->>'kind'='menu' and m.id=(i->>'id')::uuid
 where m.active and not m.sold_out and (i->>'quantity')~'^[0-9]+$' and (i->>'quantity')::integer between 1 and 20
 and (coalesce(i->>'option','')='' or (i->>'option'='HOT' and m.hot_available) or (i->>'option'='ICE' and m.iced_available));
 insert into pg_temp.tr_items
 select 'bean',p.id,null,v->>'id',p.name,v->>'size','Whole Bean',null,(i->>'quantity')::integer,coalesce((v->>'salePrice')::integer,(v->>'price')::integer),coalesce((v->>'salePrice')::integer,(v->>'price')::integer)*(i->>'quantity')::integer
 from jsonb_array_elements(p_items)i join products p on i->>'kind'='bean' and p.id=(i->>'id')::uuid
 cross join lateral jsonb_array_elements(p.variants)v
 where p.status='active' and 'tasting_room'=any(coalesce(p.sales_channels,array['online']::text[])) and v->>'id'=i->>'variant_id' and (v->>'available')::boolean
 and (i->>'quantity')~'^[0-9]+$' and (i->>'quantity')::integer between 1 and 20;
 if (select count(*) from pg_temp.tr_items)<>jsonb_array_length(p_items) then raise exception 'unavailable items'; end if;
 perform 1 from products p where p.id in(select product_id from pg_temp.tr_items where product_id is not null) order by p.id for update;
 if exists(select 1 from pg_temp.tr_items c join products p on p.id=c.product_id cross join lateral jsonb_array_elements(p.variants)v where v->>'id'=c.variant_id and c.quantity>(v->>'stock')::integer) then raise exception 'insufficient stock'; end if;
 select sum(line_total),min(name),count(*) into v_total,v_name,v_count from pg_temp.tr_items;
 v_id:=gen_random_uuid(); v_number:='TR-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(v_id::text,'-',''),1,6));
 insert into orders(id,order_number,customer_name,email,phone,fulfillment_type,delivery_method,subtotal,product_subtotal,shipping_fee,discount_amount,total,final_amount,payment_status,order_status,client_reference,guest_access_token_hash,order_source,table_label)
 values(v_id,v_number,p_customer_name,coalesce(p_email,''),p_phone,'pickup','pickup',v_total,v_total,0,0,v_total,v_total,'pending','new',p_client_reference,p_guest_token_hash,'tasting_room',nullif(left(p_table_label,30),''));
 insert into order_items(order_id,product_id,menu_item_id,item_kind,product_name,variant_id,weight,grind,selected_option,quantity,unit_price,subtotal)
 select v_id,product_id,menu_item_id,case when kind='bean' then 'bean' else case when exists(select 1 from tasting_menu_items m where m.id=menu_item_id and m.category='sweet') then 'food' else 'drink' end end,name,variant_id,weight,grind,selected_option,quantity,unit_price,line_total from pg_temp.tr_items;
 return query select v_id,v_number,v_total,v_name||case when v_count>1 then ' 외 '||(v_count-1)::text||'건' else '' end,true;
end $$;

create or replace function public.finalize_tasting_room_order(p_order_id uuid,p_payment_key text,p_amount integer,p_method text,p_approved_at timestamptz)
returns text language plpgsql security definer set search_path=public as $$
declare v_order orders%rowtype; r record; v jsonb;
begin
 select * into v_order from orders where id=p_order_id and order_source='tasting_room' for update;
 if not found or v_order.total<>p_amount then return 'mismatch'; end if;
 if v_order.payment_status='paid' then return case when v_order.payment_key=p_payment_key then 'already_paid' else 'mismatch' end; end if;
 if v_order.payment_status in('cancelled','refunded') then return 'not_payable'; end if;
 perform 1 from products p where p.id in(select product_id from order_items where order_id=p_order_id and product_id is not null) order by p.id for update;
 for r in select product_id,variant_id,sum(quantity)::integer qty from order_items where order_id=p_order_id and product_id is not null group by product_id,variant_id loop
   select value into v from products p cross join lateral jsonb_array_elements(p.variants) where p.id=r.product_id and value->>'id'=r.variant_id;
   if v is null or not coalesce((v->>'available')::boolean,false) or (v->>'stock')::integer<r.qty then return 'out_of_stock'; end if;
   update products p set variants=(select jsonb_agg(case when x->>'id'=r.variant_id then jsonb_set(x,'{stock}',to_jsonb((x->>'stock')::integer-r.qty)) else x end) from jsonb_array_elements(p.variants)x) where p.id=r.product_id;
 end loop;
 update orders set payment_status='paid',order_status='confirmed',payment_key=p_payment_key,payment_method=p_method,payment_approved_at=p_approved_at,inventory_deducted_at=now(),payment_failure_code=null,payment_failure_message=null,updated_at=now() where id=p_order_id;
 return 'paid';
end $$;

revoke all on function public.create_tasting_room_order(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_tasting_room_order(uuid,text,text,text,text,text,jsonb) to service_role;
revoke all on function public.finalize_tasting_room_order(uuid,text,integer,text,timestamptz) from public,anon,authenticated;
grant execute on function public.finalize_tasting_room_order(uuid,text,integer,text,timestamptz) to service_role;

commit;
