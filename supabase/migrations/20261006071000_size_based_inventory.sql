-- Corrective migration: inventory is a size concern. Grind remains an order option.
-- This version intentionally does not reuse 202610060001, which may already be
-- present in remote migration history.
create table if not exists public.product_size_variant_migration_backups (
  product_id uuid primary key references public.products(id) on delete cascade,
  variants jsonb not null,
  stock_quantity integer not null,
  backed_up_at timestamptz not null default now()
);
alter table public.product_size_variant_migration_backups enable row level security;
create policy "admins read size variant migration backups" on public.product_size_variant_migration_backups for select using (public.is_admin());
insert into public.product_size_variant_migration_backups(product_id,variants,stock_quantity)
select id,variants,stock_quantity from public.products on conflict(product_id) do nothing;

-- Normalize each product to exactly one inventory row per supported size. When
-- old grind rows disagree, MAX(stock) is used rather than SUM(stock): the same
-- beans may have been repeated once per grind, so summing could create stock.
do $$
declare p record; source_variants jsonb; normalized jsonb; legacy_backup jsonb; stock150 integer; stock400 integer; stock_cap integer;
begin
  for p in select * from public.products loop
    source_variants := p.variants;
    if to_regclass('public.product_variant_migration_backups') is not null then
      execute 'select variants from public.product_variant_migration_backups where product_id=$1' into legacy_backup using p.id;
      if legacy_backup is not null then source_variants := legacy_backup; end if;
    end if;

    if jsonb_typeof(source_variants)<>'array' or jsonb_array_length(source_variants)=0 then
      stock150 := greatest(0,coalesce(p.stock_quantity,0)+1)/2;
      stock400 := greatest(0,coalesce(p.stock_quantity,0))/2;
    else
      select coalesce(max(greatest(0,coalesce((v->>'stock')::integer,0))) filter(where replace(lower(v->>'size'),' ','')='150g'),0),
             coalesce(max(greatest(0,coalesce((v->>'stock')::integer,0))) filter(where replace(lower(v->>'size'),' ','')='400g'),0)
      into stock150,stock400 from jsonb_array_elements(source_variants)v;
      -- Never increase total sellable units beyond the legacy compatibility total.
      stock_cap := greatest(greatest(stock150,stock400),greatest(0,coalesce(p.stock_quantity,0)));
      if stock150+stock400>stock_cap then
        stock150:=least(stock150,stock_cap);
        stock400:=least(stock400,greatest(0,stock_cap-stock150));
      end if;
    end if;

    select jsonb_agg(jsonb_build_object(
      'id',coalesce(data.id,gen_random_uuid()::text),'size',sizes.size,
      'price',coalesce(data.price,case sizes.size when '150g' then coalesce(p.price_150g_original,p.price_150g) else coalesce(p.price_400g_original,p.price_400g) end),
      'salePrice',coalesce(data.sale_price,case sizes.size when '150g' then p.price_150g else p.price_400g end),
      'sku',coalesce(data.sku,''),'stock',case sizes.size when '150g' then stock150 else stock400 end,
      'available',coalesce(data.available,false)
    ) order by sizes.ordinal) into normalized
    from (values(1,'150g'),(2,'400g'))sizes(ordinal,size)
    left join lateral (
      select min(v->>'id') id,max(greatest(1,coalesce((v->>'price')::integer,1))) price,
        min(greatest(1,coalesce(nullif(v->>'salePrice','')::integer,(v->>'price')::integer,1))) sale_price,
        min(coalesce(v->>'sku','')) sku,bool_or(coalesce((v->>'available')::boolean,true)) available
      from jsonb_array_elements(source_variants)v where replace(lower(v->>'size'),' ','')=lower(sizes.size)
    )data on true;
    update public.products set variants=normalized,stock_quantity=stock150+stock400,updated_at=now() where id=p.id;
  end loop;
end $$;

create or replace function public.valid_product_variants(value jsonb) returns boolean language sql immutable as $$
 select jsonb_typeof(value)='array' and jsonb_array_length(value)=2
  and not exists(select 1 from jsonb_array_elements(value)v where coalesce(v->>'id','')='' or v->>'size' not in('150g','400g')
    or coalesce((v->>'price')::integer,0)<=0 or coalesce((v->>'stock')::integer,-1)<0
    or coalesce(jsonb_typeof(v->'available'),'missing')<>'boolean'
    or (nullif(v->>'salePrice','') is not null and ((v->>'salePrice')::integer<=0 or (v->>'salePrice')::integer>(v->>'price')::integer)))
  and (select count(distinct v->>'size')=2 and count(*)=count(distinct v->>'id') from jsonb_array_elements(value)v);
$$;
alter table public.products drop constraint if exists products_variants_canonical;
alter table public.products add constraint products_variants_canonical check(public.valid_product_variants(variants));

create or replace function public.sync_product_compatibility() returns trigger language plpgsql as $$
begin
 new.active:=new.status in('active','sold-out');
 if new.status<>'active' then new.todays_roast:=false; end if;
 select coalesce(sum(greatest(0,coalesce((v->>'stock')::integer,0))),0) into new.stock_quantity from jsonb_array_elements(new.variants)v;
 return new;
end $$;
drop trigger if exists sync_product_compatibility_trigger on public.products;
create trigger sync_product_compatibility_trigger before insert or update of status,variants,active on public.products for each row execute function public.sync_product_compatibility();

alter table public.order_items add column if not exists variant_id text;
update public.order_items set grind='Filter' where lower(trim(grind))='pour over';
update public.order_items oi set variant_id=(select v->>'id' from public.products p cross join lateral jsonb_array_elements(p.variants)v where p.id=oi.product_id and v->>'size'=oi.weight limit 1);

-- Recreate order creation so grind is validated/snapshotted but never locates inventory.
drop function if exists public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb);
create or replace function public.create_pending_order(
 p_client_reference uuid,p_guest_token_hash text,p_customer_name text,p_email text,p_phone text,p_delivery_method text,
 p_zonecode text,p_road_address text,p_jibun_address text,p_detail_address text,p_building_name text,p_bname text,p_memo_type text,p_memo_text text,p_items jsonb
) returns table(order_id uuid,order_number text,total integer,order_name text,token_matches boolean)
language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_number text;v_subtotal integer;v_shipping integer;v_settings delivery_settings%rowtype;v_existing orders%rowtype;v_count integer;v_name text;
begin
 select * into v_existing from orders where client_reference=p_client_reference;
 if found then return query select v_existing.id,v_existing.order_number,v_existing.total,(select oi.product_name from order_items oi where oi.order_id=v_existing.id limit 1),v_existing.guest_access_token_hash=p_guest_token_hash;return;end if;
 if p_delivery_method not in('shipping','local_delivery','pickup') then raise exception 'invalid fulfillment';end if;
 if p_delivery_method<>'pickup' and (nullif(p_zonecode,'') is null or nullif(p_road_address,'') is null or nullif(p_detail_address,'') is null) then raise exception 'address required';end if;
 if p_delivery_method='local_delivery' and not local_delivery_eligible(p_zonecode,p_bname,p_road_address,p_jibun_address) then raise exception 'local delivery unavailable';end if;
 create temporary table if not exists pg_temp.checkout_items(product_id uuid,variant_id text,product_name text,weight text,grind text,quantity integer,unit_price integer,line_total integer)on commit drop;truncate pg_temp.checkout_items;
 insert into pg_temp.checkout_items select p.id,v->>'id',p.name,v->>'size',i->>'grind',(i->>'quantity')::integer,coalesce(nullif(v->>'salePrice','')::integer,(v->>'price')::integer),coalesce(nullif(v->>'salePrice','')::integer,(v->>'price')::integer)*(i->>'quantity')::integer
 from jsonb_array_elements(p_items)i join products p on p.id=(i->>'product_id')::uuid and p.status='active' cross join lateral jsonb_array_elements(p.variants)v
 where v->>'id'=i->>'variant_id' and v->>'size'=i->>'weight' and i->>'grind' in('Whole Bean','Filter','Espresso') and coalesce((v->>'available')::boolean,false) and (i->>'quantity')::integer between 1 and 20;
 if(select count(*)from pg_temp.checkout_items)<>jsonb_array_length(p_items)then raise exception 'unavailable items';end if;
 perform 1 from products p where p.id in(select distinct product_id from pg_temp.checkout_items)order by p.id for update;
 if exists(select 1 from(select product_id,variant_id,sum(quantity)quantity from pg_temp.checkout_items group by product_id,variant_id)q join products p on p.id=q.product_id left join lateral(select v from jsonb_array_elements(p.variants)v where v->>'id'=q.variant_id and coalesce((v->>'available')::boolean,false)limit 1)m on true where m.v is null or(m.v->>'stock')::integer<q.quantity)then raise exception 'insufficient stock';end if;
 select sum(line_total),min(product_name),count(*)into v_subtotal,v_name,v_count from pg_temp.checkout_items;select * into v_settings from delivery_settings where id=true;
 v_shipping:=case when p_delivery_method='shipping' and v_subtotal<v_settings.free_shipping_threshold then v_settings.standard_shipping_fee else 0 end;v_id:=gen_random_uuid();v_number:='TM-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(v_id::text,'-',''),1,8));
 insert into orders(id,order_number,user_id,customer_name,email,phone,fulfillment_type,postal_code,address,address_detail,delivery_message,subtotal,shipping_fee,total,payment_status,order_status,client_reference,guest_access_token_hash,delivery_method,recipient_name,recipient_phone,shipping_zonecode,shipping_road_address,shipping_jibun_address,shipping_detail_address,shipping_building_name,shipping_bname,shipping_memo_type,shipping_memo_text,product_subtotal,discount_amount,final_amount)
 values(v_id,v_number,auth.uid(),p_customer_name,p_email,p_phone,case when p_delivery_method='pickup'then'pickup'::fulfillment_type else'delivery'::fulfillment_type end,p_zonecode,p_road_address,p_detail_address,coalesce(nullif(p_memo_text,''),p_memo_type),v_subtotal,v_shipping,v_subtotal+v_shipping,'pending','new',p_client_reference,p_guest_token_hash,p_delivery_method,p_customer_name,p_phone,p_zonecode,p_road_address,p_jibun_address,p_detail_address,p_building_name,p_bname,p_memo_type,p_memo_text,v_subtotal,0,v_subtotal+v_shipping);
 insert into order_items(order_id,product_id,variant_id,product_name,weight,grind,quantity,unit_price,subtotal)select v_id,product_id,variant_id,product_name,weight,grind,quantity,unit_price,line_total from pg_temp.checkout_items;
 return query select v_id,v_number,v_subtotal+v_shipping,v_name||case when v_count>1 then' 외 '||(v_count-1)::text||'건'else''end,true;
end $$;
revoke all on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb)from public;
grant execute on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb)to anon,authenticated;

-- Keep the status and singleton Today's Roast protections even when the remote
-- 202610060001 migration had different contents.
update public.products set todays_roast=false where todays_roast and id not in(select id from public.products where todays_roast order by updated_at desc nulls last,id limit 1);
create unique index if not exists products_one_todays_roast on public.products((todays_roast))where todays_roast;
create or replace function public.set_todays_roast(p_product_id uuid)returns void language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from products where id=p_product_id and status='active')then raise exception 'Today''s Roast must be an active product';end if;
 update products set todays_roast=false where todays_roast and id<>p_product_id;
 update products set todays_roast=true where id=p_product_id;
end $$;
grant execute on function public.set_todays_roast(uuid)to authenticated;

-- Product rows are locked in a stable order; aggregated quantities for the same
-- size variant are checked once, then only those variant ids are decremented.
create or replace function public.finalize_paid_order(p_order_id uuid,p_payment_key text,p_amount integer,p_method text,p_approved_at timestamptz)
returns text language plpgsql security definer set search_path=public as $$
declare v_order orders%rowtype;
begin
 select * into v_order from orders where id=p_order_id for update;
 if not found or v_order.total<>p_amount then return'mismatch';end if;
 if v_order.payment_status='paid'then return case when v_order.payment_key=p_payment_key then'already_paid'else'mismatch'end;end if;
 if v_order.payment_status in('cancelled','refunded')then return'not_payable';end if;
 perform 1 from products p where p.id in(select product_id from order_items where order_id=p_order_id and product_id is not null)order by p.id for update;
 if exists(select 1 from(select product_id,variant_id,sum(quantity)quantity from order_items where order_id=p_order_id group by product_id,variant_id)q join products p on p.id=q.product_id left join lateral(select v from jsonb_array_elements(p.variants)v where v->>'id'=q.variant_id limit 1)m on true where q.variant_id is null or m.v is null or(m.v->>'stock')::integer<q.quantity)then return'out_of_stock';end if;
 update products p set variants=(select jsonb_agg(case when q.quantity is not null then jsonb_set(v,'{stock}',to_jsonb((v->>'stock')::integer-q.quantity))else v end order by ordinality)from jsonb_array_elements(p.variants)with ordinality x(v,ordinality)left join(select variant_id,sum(quantity)::integer quantity from order_items where order_id=p_order_id and product_id=p.id group by variant_id)q on q.variant_id=v->>'id')where p.id in(select product_id from order_items where order_id=p_order_id);
 update orders set payment_status='paid',order_status='confirmed',payment_key=p_payment_key,payment_method=p_method,payment_approved_at=p_approved_at,inventory_deducted_at=now(),payment_failure_code=null,payment_failure_message=null,updated_at=now()where id=p_order_id;
 return'paid';
end $$;
revoke all on function public.finalize_paid_order(uuid,text,integer,text,timestamptz)from public;
grant execute on function public.finalize_paid_order(uuid,text,integer,text,timestamptz)to service_role;
