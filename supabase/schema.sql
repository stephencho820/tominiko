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
  product_type text not null default 'single-origin' check (product_type in ('single-origin', 'blend', 'decaf')),
  origin text not null, region text, producer text, variety text, process text, roast_level text,
  tasting_notes text, description text, roasted_date date, price_150g_original integer, price_150g integer not null default 0,
  price_400g_original integer,
  price_400g integer not null default 0, stock_quantity integer not null default 0,
  active boolean not null default true, featured boolean not null default false,
  todays_roast boolean not null default false, discovery_tags text[] not null default '{}', display_order integer not null default 0,
  image_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.products add column if not exists price_400g_original integer;
alter table public.products add column if not exists discovery_tags text[] not null default '{}';
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
create table public.page_settings (
  slug text primary key, texts jsonb not null default '{}'::jsonb,
  images jsonb not null default '{}'::jsonb,
  tasting_room jsonb not null default '{}'::jsonb,
  hero_media jsonb, promotions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Payment lifecycle columns and atomic functions are maintained in the migration.
-- Run supabase/migrations/202609170001_payments.sql after this base schema.

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, email, name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security; alter table public.products enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security; alter table public.page_settings enable row level security;
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
create policy "page settings are public" on public.page_settings for select using (true);
create policy "admins manage page settings" on public.page_settings for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('page-images', 'page-images', true) on conflict (id) do nothing;
create policy "public product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "admins upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());
create policy "public page images" on storage.objects for select using (bucket_id = 'page-images');
create policy "admins upload page images" on storage.objects for insert with check (bucket_id = 'page-images' and public.is_admin());
create policy "admins update page images" on storage.objects for update using (bucket_id = 'page-images' and public.is_admin());
create policy "admins delete page images" on storage.objects for delete using (bucket_id = 'page-images' and public.is_admin());


-- Product reviews
create table public.review_settings (
  id boolean primary key default true check (id),
  allow_guest_reviews boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.review_settings (id) values (true) on conflict do nothing;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  content text not null check (char_length(content) between 1 and 5000),
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 80),
  is_verified_purchase boolean not null default false,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_product_published_created_idx on public.reviews(product_id, created_at desc) where status = 'published';
create index reviews_user_idx on public.reviews(user_id) where user_id is not null;

create table public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  sort_order integer not null default 0 check (sort_order between 0 and 4),
  width integer,
  height integer,
  file_size integer,
  created_at timestamptz not null default now(),
  unique(review_id, sort_order)
);

-- Cached per-product values keep catalog and detail cards consistent without scanning reviews.
create table public.product_review_summaries (
  product_id uuid primary key references public.products(id) on delete cascade,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  rating_1 integer not null default 0, rating_2 integer not null default 0,
  rating_3 integer not null default 0, rating_4 integer not null default 0,
  rating_5 integer not null default 0, updated_at timestamptz not null default now()
);
create or replace function public.refresh_product_review_summary() returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid := coalesce(new.product_id, old.product_id);
begin
  insert into product_review_summaries(product_id, average_rating, review_count, rating_1, rating_2, rating_3, rating_4, rating_5, updated_at)
  select target, coalesce(round(avg(rating)::numeric, 2), 0), count(*)::int,
    count(*) filter(where rating=1)::int, count(*) filter(where rating=2)::int,
    count(*) filter(where rating=3)::int, count(*) filter(where rating=4)::int,
    count(*) filter(where rating=5)::int, now()
  from reviews where product_id=target and status='published'
  on conflict(product_id) do update set average_rating=excluded.average_rating, review_count=excluded.review_count,
    rating_1=excluded.rating_1, rating_2=excluded.rating_2, rating_3=excluded.rating_3,
    rating_4=excluded.rating_4, rating_5=excluded.rating_5, updated_at=now();
  return null; -- return value is ignored for this AFTER trigger
end $$;
create trigger review_summary_refresh after insert or update of rating,status or delete on public.reviews for each row execute function public.refresh_product_review_summary();

alter table public.reviews enable row level security;
alter table public.review_images enable row level security;
alter table public.review_settings enable row level security;
alter table public.product_review_summaries enable row level security;
create policy "published reviews are public" on public.reviews for select using (status='published' or user_id=auth.uid() or public.is_admin());
create policy "users manage own reviews" on public.reviews for all using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
create policy "published review images are public" on public.review_images for select using (exists(select 1 from reviews where reviews.id=review_id and reviews.status='published') or public.is_admin());
create policy "users add own review images" on public.review_images for insert with check (exists(select 1 from reviews where reviews.id=review_id and reviews.user_id=auth.uid()) or public.is_admin());
create policy "users delete own review images" on public.review_images for delete using (exists(select 1 from reviews where reviews.id=review_id and reviews.user_id=auth.uid()) or public.is_admin());
create policy "review settings readable" on public.review_settings for select using (true);
create policy "admins manage review settings" on public.review_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "review summaries public" on public.product_review_summaries for select using (true);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('review-images','review-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy "public review images" on storage.objects for select using(bucket_id='review-images');
create policy "admins delete review image objects" on storage.objects for delete using(bucket_id='review-images' and public.is_admin());

-- Ask PostgREST to refresh immediately after this migration. This only runs after
-- the physical tables exist; it is not a substitute for applying the migration.
notify pgrst, 'reload schema';
