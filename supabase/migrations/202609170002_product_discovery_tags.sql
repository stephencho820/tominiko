-- Lightweight, operator-managed matching for the home coffee discovery.
alter table public.products
  add column if not exists discovery_tags text[] not null default '{}';

create index if not exists products_discovery_tags_idx
  on public.products using gin (discovery_tags);
