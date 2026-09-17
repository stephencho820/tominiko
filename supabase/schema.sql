create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'admin');
create type public.fulfillment_type as enum ('delivery', 'pickup');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.order_status as enum ('new', 'confirmed', 'roasting', 'preparing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  origin text not null, region text, producer text, variety text, process text, roast_level text,
  tasting_notes text, description text, roasted_date date, price_150g integer not null default 0,
  price_150g_original integer,
  price_300g integer not null default 0, stock_quantity integer not null default 0,
  active boolean not null default true, featured boolean not null default false,
  todays_roast boolean not null default false, discovery_tags text[] not null default '{}', display_order integer not null default 0,
  image_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.products add column if not exists price_150g_original integer;
alter table public.products add column if not exists discovery_tags text[] not null default '{}';
create unique index if not exists products_one_todays_roast on public.products (todays_roast) where todays_roast = true;
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text unique not null,
  user_id uuid references auth.users(id) on delete set null, customer_name text not null,
  email text not null, phone text not null, fulfillment_type public.fulfillment_type not null,
  postal_code text, address text, address_detail text, delivery_message text,
  subtotal integer not null, shipping_fee integer not null default 0, total integer not null,
  payment_status public.payment_status not null default 'pending',
  order_status public.order_status not null default 'new', created_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null, product_name text not null,
  weight text not null, grind text not null, quantity integer not null check (quantity > 0),
  unit_price integer not null, subtotal integer not null
);

-- Payment lifecycle columns and atomic functions are maintained in the migration.
-- Run supabase/migrations/202609170001_payments.sql after this base schema.

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, email, name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security; alter table public.products enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;
create policy "active products are public" on public.products for select using (active = true or public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "users see own orders" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "guests and users create orders" on public.orders for insert with check (user_id is null or user_id = auth.uid());
create policy "admins update orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "users see own items" on public.order_items for select using (exists (select 1 from public.orders where orders.id = order_id and (orders.user_id = auth.uid() or public.is_admin())));
create policy "order creators add items" on public.order_items for insert with check (exists (select 1 from public.orders where orders.id = order_id and (orders.user_id = auth.uid() or orders.user_id is null)));
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
create policy "public product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "admins upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());
