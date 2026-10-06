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
