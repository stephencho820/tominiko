-- Daily, human-readable pickup sequence; UUID remains the internal order ID.
-- Sequence resets at midnight Asia/Seoul. Unique numbers are assigned atomically.
begin;
create table if not exists public.tasting_order_daily_counters(
 business_date date primary key,
 last_number integer not null check(last_number>0)
);
alter table public.tasting_order_daily_counters enable row level security;
revoke all on public.tasting_order_daily_counters from public,anon,authenticated;
create or replace function public.create_tasting_room_order(
 p_client_reference uuid,p_guest_token_hash text,p_customer_name text,p_phone text,p_email text,p_table_label text,p_items jsonb
) returns table(order_id uuid,order_number text,total integer,order_name text,token_matches boolean)
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_number text; v_total integer; v_name text; v_count integer; v_existing orders%rowtype; v_business_date date; v_sequence integer;
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
 v_id:=gen_random_uuid();
 v_business_date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
 insert into public.tasting_order_daily_counters(business_date,last_number)
 values(v_business_date,1)
 on conflict (business_date) do update set last_number=public.tasting_order_daily_counters.last_number+1
 returning last_number into v_sequence;
 v_number:='TR-'||to_char(v_business_date,'YYMMDD')||'-'||lpad(v_sequence::text,3,'0');
 insert into orders(id,order_number,customer_name,email,phone,fulfillment_type,delivery_method,subtotal,product_subtotal,shipping_fee,discount_amount,total,final_amount,payment_status,order_status,client_reference,guest_access_token_hash,order_source,table_label)
 values(v_id,v_number,p_customer_name,coalesce(p_email,''),p_phone,'pickup','pickup',v_total,v_total,0,0,v_total,v_total,'pending','new',p_client_reference,p_guest_token_hash,'tasting_room',nullif(left(p_table_label,30),''));
 insert into order_items(order_id,product_id,menu_item_id,item_kind,product_name,variant_id,weight,grind,selected_option,quantity,unit_price,subtotal)
 select v_id,product_id,menu_item_id,case when kind='bean' then 'bean' else case when exists(select 1 from tasting_menu_items m where m.id=menu_item_id and m.category='sweet') then 'food' else 'drink' end end,name,variant_id,weight,grind,selected_option,quantity,unit_price,line_total from pg_temp.tr_items;
 return query select v_id,v_number,v_total,v_name||case when v_count>1 then ' 외 '||(v_count-1)::text||'건' else '' end,true;
end $$;


revoke all on function public.create_tasting_room_order(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_tasting_room_order(uuid,text,text,text,text,text,jsonb) to service_role;
commit;
