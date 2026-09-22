-- Separate catalogue type from curation metadata and introduce the 400g pricing tier.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_300g')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_400g') then
    alter table public.products rename column price_300g to price_400g;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_150g_original')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_400g_original') then
    alter table public.products rename column price_150g_original to price_400g_original;
  end if;
end $$;

alter table public.products
  add column if not exists product_type text not null default 'single-origin',
  add column if not exists price_400g integer not null default 29000,
  add column if not exists price_400g_original integer;

alter table public.products drop constraint if exists products_product_type_check;
alter table public.products add constraint products_product_type_check check (product_type in ('single-origin', 'blend', 'decaf'));
drop index if exists public.products_one_todays_roast;

-- Current catalogue pricing; future products can set these values independently in admin.
update public.products set price_150g = 13000, price_400g = 29000, price_400g_original = 35000;

create or replace function public.create_pending_order(
  p_client_reference uuid, p_guest_token_hash text, p_customer_name text, p_email text, p_phone text,
  p_fulfillment_type text, p_postal_code text, p_address text, p_address_detail text,
  p_delivery_message text, p_items jsonb
) returns table(order_id uuid, order_number text, total integer, order_name text, token_matches boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_subtotal integer;
  v_first_name text;
  v_count integer;
  v_existing public.orders%rowtype;
begin
  select * into v_existing from public.orders where client_reference = p_client_reference;
  if found then
    return query select v_existing.id, v_existing.order_number, v_existing.total,
      (select oi.product_name || case when count(*) over () > 1 then ' 외 ' || (count(*) over () - 1)::text || '건' else '' end
       from public.order_items oi where oi.order_id = v_existing.id order by oi.id limit 1),
      v_existing.guest_access_token_hash = p_guest_token_hash;
    return;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'unavailable items'; end if;
  if p_fulfillment_type not in ('delivery', 'pickup') then raise exception 'invalid fulfillment'; end if;

  create temporary table if not exists pg_temp.checkout_items (
    product_id uuid, product_name text, weight text, grind text, quantity integer, unit_price integer, line_total integer
  ) on commit drop;
  truncate pg_temp.checkout_items;

  insert into pg_temp.checkout_items
  select p.id, p.name, i->>'weight', i->>'grind', (i->>'quantity')::integer,
    case i->>'weight' when '150g' then p.price_150g when '400g' then p.price_400g end,
    (case i->>'weight' when '150g' then p.price_150g when '400g' then p.price_400g end) * (i->>'quantity')::integer
  from jsonb_array_elements(p_items) i
  join public.products p on p.id = (i->>'product_id')::uuid and p.active
  where i->>'weight' in ('150g', '400g') and i->>'grind' in ('Whole Bean', 'Filter', 'Espresso')
    and (i->>'quantity')::integer between 1 and 20;

  if (select count(*) from pg_temp.checkout_items) <> jsonb_array_length(p_items) then raise exception 'unavailable items'; end if;
  -- Lock product rows while stock is checked. Actual deduction happens atomically only after Toss approval.
  perform 1 from public.products p where p.id in (select distinct c.product_id from pg_temp.checkout_items c) order by p.id for update;
  if exists (
    select 1 from public.products p join (
      select c.product_id, sum(c.quantity) quantity from pg_temp.checkout_items c group by c.product_id
    ) q on q.product_id = p.id where q.quantity > p.stock_quantity
  ) then raise exception 'insufficient stock'; end if;

  select sum(c.line_total), min(c.product_name), count(*) into v_subtotal, v_first_name, v_count from pg_temp.checkout_items c;
  v_order_id := gen_random_uuid();
  v_order_number := 'TM-' || to_char(clock_timestamp(), 'YYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 8));
  insert into public.orders(id, order_number, user_id, customer_name, email, phone, fulfillment_type,
    postal_code, address, address_detail, delivery_message, subtotal, shipping_fee, total,
    payment_status, order_status, client_reference, guest_access_token_hash)
  values(v_order_id, v_order_number, auth.uid(), p_customer_name, p_email, p_phone, p_fulfillment_type::public.fulfillment_type,
    p_postal_code, p_address, p_address_detail, p_delivery_message, v_subtotal, 0, v_subtotal,
    'pending', 'new', p_client_reference, p_guest_token_hash);
  insert into public.order_items(order_id, product_id, product_name, weight, grind, quantity, unit_price, subtotal)
    select v_order_id, c.product_id, c.product_name, c.weight, c.grind, c.quantity, c.unit_price, c.line_total from pg_temp.checkout_items c;
  return query select v_order_id, v_order_number, v_subtotal,
    v_first_name || case when v_count > 1 then ' 외 ' || (v_count - 1)::text || '건' else '' end, true;
end; $$;

create or replace function public.finalize_paid_order(
  p_order_id uuid, p_payment_key text, p_amount integer, p_method text, p_approved_at timestamptz
) returns text language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
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
    select 1 from public.products p join (
      select oi.product_id, sum(oi.quantity) quantity from public.order_items oi where oi.order_id = p_order_id group by oi.product_id
    ) q on q.product_id = p.id where p.stock_quantity < q.quantity
  ) then return 'out_of_stock'; end if;

  update public.products p set stock_quantity = p.stock_quantity - q.quantity, updated_at = now()
  from (select oi.product_id, sum(oi.quantity)::integer quantity from public.order_items oi where oi.order_id = p_order_id group by oi.product_id) q
  where p.id = q.product_id;
  update public.orders set payment_status = 'paid', order_status = 'confirmed', payment_key = p_payment_key,
    payment_method = p_method, payment_approved_at = p_approved_at, inventory_deducted_at = now(),
    payment_failure_code = null, payment_failure_message = null, updated_at = now() where id = p_order_id;
  return 'paid';
end; $$;

create or replace function public.record_payment_failure(p_order_id uuid, p_code text, p_message text, p_cancelled boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set payment_status = case when p_cancelled then 'cancelled'::public.payment_status else 'failed'::public.payment_status end,
    payment_failure_code = left(p_code, 100), payment_failure_message = left(p_message, 500), updated_at = now()
  where id = p_order_id and payment_status in ('pending', 'failed');
end; $$;

create or replace function public.record_payment_refund(p_order_id uuid, p_payment_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set payment_status = 'refunded', updated_at = now()
  where id = p_order_id and payment_key = p_payment_key and payment_status = 'paid';
end; $$;

revoke all on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,jsonb) to anon, authenticated;
revoke all on function public.finalize_paid_order(uuid,text,integer,text,timestamptz) from public;
revoke all on function public.record_payment_failure(uuid,text,text,boolean) from public;
revoke all on function public.record_payment_refund(uuid,text) from public;
grant execute on function public.finalize_paid_order(uuid,text,integer,text,timestamptz) to service_role;
grant execute on function public.record_payment_failure(uuid,text,text,boolean) to service_role;
grant execute on function public.record_payment_refund(uuid,text) to service_role;
