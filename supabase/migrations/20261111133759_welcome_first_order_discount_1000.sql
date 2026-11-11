begin;

-- New-account, first-order welcome gift. Pricing remains server-authoritative.
create table if not exists public.welcome_discount_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  amount integer not null default 1000 check (amount between 1 and 100000),
  started_at timestamptz not null default now()
);
insert into public.welcome_discount_settings (id, enabled, amount)
values (true, true, 1000) on conflict (id) do nothing;
alter table public.welcome_discount_settings enable row level security;
revoke all on table public.welcome_discount_settings from public, anon, authenticated;
grant select on table public.welcome_discount_settings to service_role;

alter table public.orders
  add column if not exists welcome_discount_applied boolean not null default false;
create unique index if not exists orders_one_welcome_discount_per_member
  on public.orders (user_id) where welcome_discount_applied = true;

-- The website server invokes this after linking the verified account to the order.
-- The caller cannot choose a discount or bypass the first-order checks.
create or replace function public.apply_welcome_discount(
  p_order_id uuid, p_user_id uuid, p_guest_token_hash text
)
returns table(applied boolean, final_total integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_setting public.welcome_discount_settings%rowtype;
  v_discount integer;
  v_total integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 20261111));
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found or v_order.user_id is distinct from p_user_id
     or v_order.guest_access_token_hash is distinct from p_guest_token_hash then
    raise exception 'Welcome discount order verification failed';
  end if;

  if v_order.welcome_discount_applied then
    return query select true, v_order.total;
    return;
  end if;
  if v_order.payment_status <> 'pending' then
    return query select false, v_order.total;
    return;
  end if;

  select * into v_setting from public.welcome_discount_settings s
  where s.id = true and s.enabled = true;
  if not found or not exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.created_at >= v_setting.started_at
  ) or exists (
    select 1 from public.orders other
    where other.user_id = p_user_id and other.id <> p_order_id
  ) then
    return query select false, v_order.total;
    return;
  end if;

  v_discount := least(v_setting.amount, greatest(coalesce(v_order.product_subtotal, v_order.subtotal), 0));
  if v_discount <= 0 then
    return query select false, v_order.total;
    return;
  end if;

  update public.orders o
  set discount_amount = coalesce(o.discount_amount, 0) + v_discount,
      welcome_discount_applied = true,
      total = greatest(0, o.total - v_discount),
      final_amount = greatest(0, coalesce(o.final_amount, o.total) - v_discount)
  where o.id = p_order_id
  returning o.total into v_total;
  return query select true, v_total;
end;
$$;
revoke all on function public.apply_welcome_discount(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_welcome_discount(uuid, uuid, text) to service_role;

commit;