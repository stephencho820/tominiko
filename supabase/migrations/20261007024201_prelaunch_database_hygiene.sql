begin;

create index if not exists order_items_order_id_idx
  on public.order_items(order_id);

create index if not exists order_items_product_id_idx
  on public.order_items(product_id);

create index if not exists orders_user_id_idx
  on public.orders(user_id);

create index if not exists reviews_order_id_idx
  on public.reviews(order_id);

alter policy "users manage own addresses"
  on public.user_addresses
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.orders
  validate constraint orders_delivery_method_check;

alter table public.product_inventory_backup_20261006
  add constraint product_inventory_backup_20261006_pkey primary key (product_id);

alter table public.product_inventory_backup_20261006
  set schema private;

commit;
