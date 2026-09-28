-- A single, extensible product record powers Home, Shop, PDP and Cart.
alter table public.products
  add column if not exists korean_name text,
  add column if not exists subtitle text,
  add column if not exists short_description text,
  add column if not exists category text check (category in ('comfortable','bright','decaf','blend','special')),
  add column if not exists status text not null default 'active' check (status in ('draft','active','sold-out','hidden')),
  add column if not exists sale_price integer,
  add column if not exists gallery_images text[] not null default '{}',
  add column if not exists washing_station text,
  add column if not exists altitude text,
  add column if not exists harvest text,
  add column if not exists grade text,
  add column if not exists acidity smallint check (acidity between 1 and 5),
  add column if not exists sweetness smallint check (sweetness between 1 and 5),
  add column if not exists body smallint check (body between 1 and 5),
  add column if not exists about text,
  add column if not exists why_we_chose_it text,
  add column if not exists roaster_note text,
  add column if not exists recommended_brewing_methods text[] not null default '{}',
  add column if not exists brewing_dose text,
  add column if not exists brewing_water text,
  add column if not exists brewing_temperature text,
  add column if not exists brewing_grind text,
  add column if not exists brewing_time text,
  add column if not exists use_default_recipe boolean not null default true,
  add column if not exists variants jsonb not null default '[]'::jsonb;

update public.products set
  category = case when product_type = 'decaf' then 'decaf' when product_type = 'blend' then 'blend' when 'bright-fruity' = any(discovery_tags) then 'bright' else 'comfortable' end,
  status = case when not active then 'hidden' when stock_quantity = 0 then 'sold-out' else 'active' end
where category is null;
