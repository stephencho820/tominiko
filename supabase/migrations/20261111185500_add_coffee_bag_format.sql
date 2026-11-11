-- Coffee bags are independent products sold by pack, not the 150g/400g bean weights.
alter table public.products add column if not exists product_format text not null default 'beans';
alter table public.products add constraint products_product_format_check check (product_format in ('beans','coffee_bag'));
alter table public.products drop constraint if exists products_price_150g_positive;
alter table public.products drop constraint if exists products_price_400g_positive;
alter table public.products
 add constraint products_price_150g_positive check (price_150g > 0 or (product_format='coffee_bag' and price_150g=0)),
 add constraint products_price_400g_positive check (price_400g > 0 or (product_format='coffee_bag' and price_400g=0));

-- Existing strict stock/price validation extended only to coffee-bag drafts and packs.
CREATE OR REPLACE FUNCTION public.enforce_size_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v jsonb; ids text[] := '{}'; sizes text[] := '{}'; total_stock bigint := 0;
begin
 if jsonb_typeof(new.variants) is distinct from 'array' or jsonb_array_length(new.variants) <> 2 then raise exception 'Exactly two size variants required'; end if;
 for v in select value from jsonb_array_elements(new.variants) loop
  if jsonb_typeof(v->'id') is distinct from 'string' or (v->>'id') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'
   or ((new.product_format='beans' and (v->>'size') not in ('150g','400g')) or (new.product_format='coffee_bag' and (v->>'size') not in ('5개입','10개입'))) or v->>'size' is null
   or v->>'id'=any(ids) or v->>'size'=any(sizes)
   or jsonb_typeof(v->'price') is distinct from 'number' or (v->>'price') !~ '^[0-9]+$' or (v->>'price')::bigint not between (case when new.product_format='coffee_bag' and new.status in ('draft','hidden') then 0 else 1 end) and 2147483647
   or jsonb_typeof(v->'stock') is distinct from 'number' or (v->>'stock') !~ '^[0-9]+$' or (v->>'stock')::bigint not between 0 and 2147483647
   or jsonb_typeof(v->'available') is distinct from 'boolean'
   or (v ? 'salePrice' and v->'salePrice' <> 'null'::jsonb and (jsonb_typeof(v->'salePrice') <> 'number' or (v->>'salePrice') !~ '^[0-9]+$' or (v->>'salePrice')::bigint not between 1 and (v->>'price')::bigint))
   or ((v->>'price')::bigint=0 and ((v->>'stock')::bigint<>0 or (v->>'available')::boolean))
   or v ? 'grindType' then raise exception 'Invalid size inventory'; end if;
  ids:=array_append(ids,v->>'id'); sizes:=array_append(sizes,v->>'size'); total_stock:=total_stock+(v->>'stock')::bigint;
  if new.product_format='beans' then
    if v->>'size'='150g' then new.price_150g_original:=(v->>'price')::integer; new.price_150g:=coalesce((v->>'salePrice')::integer,(v->>'price')::integer);
    else new.price_400g_original:=(v->>'price')::integer; new.price_400g:=coalesce((v->>'salePrice')::integer,(v->>'price')::integer); end if;
  end if;
 end loop;
 if new.product_format='coffee_bag' then
  new.price_150g:=0; new.price_400g:=0;
  new.price_150g_original:=null; new.price_400g_original:=null;
  new.todays_roast:=false;
 end if;
 new.stock_quantity:=total_stock; new.sale_price:=null;
 new.active:=new.status in ('active','sold-out');
 if new.status is distinct from 'active' then new.todays_roast:=false; end if;
 if new.todays_roast and (tg_op='INSERT' or not old.todays_roast) then
  update public.products set todays_roast=false where todays_roast and id<>new.id;
 end if;
 return new;
end $function$;

-- Verify product format and real server price during checkout; avoid mismatched grind.
CREATE OR REPLACE FUNCTION public.create_pending_order(p_client_reference uuid, p_guest_token_hash text, p_customer_name text, p_email text, p_phone text, p_delivery_method text, p_zonecode text, p_road_address text, p_jibun_address text, p_detail_address text, p_building_name text, p_bname text, p_memo_type text, p_memo_text text, p_items jsonb)
 RETURNS TABLE(order_id uuid, order_number text, total integer, order_name text, token_matches boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
 and ((p.product_format='coffee_bag' and i->>'grind'='Coffee Bag' and v->>'size' in ('5개입','10개입')) or (p.product_format='beans' and i->>'grind' in ('Whole Bean','Filter','Pour Over','Espresso') and v->>'size' in ('150g','400g'))) and (i->>'quantity') ~ '^[0-9]+$' and (i->>'quantity')::integer between 1 and 20;
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
end $function$;
