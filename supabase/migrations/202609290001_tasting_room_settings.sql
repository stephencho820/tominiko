alter table public.page_settings
  add column if not exists tasting_room jsonb not null default '{}'::jsonb;
