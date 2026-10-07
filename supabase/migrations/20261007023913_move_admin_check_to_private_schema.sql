begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

alter policy "admins manage delivery settings"
  on public.delivery_settings
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "admins manage zones"
  on public.local_delivery_zones
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "users see own items"
  on public.order_items
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and (
          orders.user_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  );

alter policy "admins update orders"
  on public.orders
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "users see own orders"
  on public.orders
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
  );

alter policy "admins manage page settings"
  on public.page_settings
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "active products are public"
  on public.products
  using (
    active = true
    or (select private.is_admin())
  );

alter policy "admins manage products"
  on public.products
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "admins manage profiles"
  on public.profiles
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "own profile"
  on public.profiles
  using (
    id = (select auth.uid())
    or (select private.is_admin())
  );

alter policy "published review images are public"
  on public.review_images
  using (
    exists (
      select 1
      from public.reviews
      where reviews.id = review_images.review_id
        and reviews.status = 'published'
    )
    or (select private.is_admin())
  );

alter policy "users add own review images"
  on public.review_images
  with check (
    exists (
      select 1
      from public.reviews
      where reviews.id = review_images.review_id
        and reviews.user_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

alter policy "users delete own review images"
  on public.review_images
  using (
    exists (
      select 1
      from public.reviews
      where reviews.id = review_images.review_id
        and reviews.user_id = (select auth.uid())
    )
    or (select private.is_admin())
  );

alter policy "admins manage review settings"
  on public.review_settings
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "published reviews are public"
  on public.reviews
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select private.is_admin())
  );

alter policy "users manage own reviews"
  on public.reviews
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
  )
  with check (
    user_id = (select auth.uid())
    or (select private.is_admin())
  );

alter policy "admins delete page images"
  on storage.objects
  using (bucket_id = 'page-images' and (select private.is_admin()));

alter policy "admins delete product images"
  on storage.objects
  using (bucket_id = 'product-images' and (select private.is_admin()));

alter policy "admins delete review image objects"
  on storage.objects
  using (bucket_id = 'review-images' and (select private.is_admin()));

alter policy "admins update page images"
  on storage.objects
  using (bucket_id = 'page-images' and (select private.is_admin()));

alter policy "admins upload page images"
  on storage.objects
  with check (bucket_id = 'page-images' and (select private.is_admin()));

alter policy "admins upload product images"
  on storage.objects
  with check (bucket_id = 'product-images' and (select private.is_admin()));

drop function public.is_admin();

commit;
