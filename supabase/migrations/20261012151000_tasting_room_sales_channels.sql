begin;

alter table public.products
  add column if not exists sales_channels text[] not null default array['online']::text[];

alter table public.products
  drop constraint if exists products_sales_channels_check;
alter table public.products
  add constraint products_sales_channels_check check (
    cardinality(sales_channels) between 1 and 2
    and sales_channels <@ array['online','tasting_room']::text[]
  );

create index if not exists products_sales_channels_gin on public.products using gin (sales_channels);

commit;
