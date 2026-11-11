begin;

-- The coffee's origin/type remains independent of its sellable format.
alter table public.products add column if not exists product_format text not null default 'beans';
alter table public.products drop constraint if exists products_product_format_check;
alter table public.products add constraint products_product_format_check check (product_format in ('beans','coffee_bag'));

-- Legacy weight prices are deliberately unused for coffee bags.
alter table public.products drop constraint if exists products_price_150g_positive;
alter table public.products add constraint products_price_150g_positive
  check (price_150g > 0 or (product_format = 'coffee_bag' and price_150g = 0));
alter table public.products drop constraint if exists products_price_400g_positive;
alter table public.products add constraint products_price_400g_positive
  check (price_400g > 0 or (product_format = 'coffee_bag' and price_400g = 0));

create or replace function public.enforce_size_inventory() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v jsonb;
  ids text[] := '{}';
  sizes text[] := '{}';
  total_stock bigint := 0;
  expected text[];
begin
  if new.product_format = 'beans' then
    expected := array['150g','400g'];
  elsif new.product_format = 'coffee_bag' then
    expected := array['1개입','5개입','10개입'];
  else
    raise exception 'Invalid product format';
  end if;

  if jsonb_typeof(new.variants) is distinct from 'array'
    or jsonb_array_length(new.variants) <> array_length(expected,1)
  then raise exception 'Wrong inventory option count'; end if;

  for v in select value from jsonb_array_elements(new.variants) loop
    if jsonb_typeof(v->'id') is distinct from 'string'
      or (v->>'id') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'
      or not ((v->>'size') = any(expected))
      or v->>'id' = any(ids) or v->>'size' = any(sizes)
      or jsonb_typeof(v->'price') is distinct from 'number'
      or (v->>'price') !~ '^[0-9]+$'
      or (v->>'price')::bigint not between 1 and 2147483647
      or jsonb_typeof(v->'stock') is distinct from 'number'
      or (v->>'stock') !~ '^[0-9]+$'
      or (v->>'stock')::bigint not between 0 and 2147483647
      or jsonb_typeof(v->'available') is distinct from 'boolean'
      or (v ? 'salePrice' and v->'salePrice' <> 'null'::jsonb
        and (jsonb_typeof(v->'salePrice') <> 'number'
        or (v->>'salePrice') !~ '^[0-9]+$'
        or (v->>'salePrice')::bigint not between 1 and (v->>'price')::bigint))
      or v ? 'grindType'
    then raise exception 'Invalid inventory option'; end if;

    ids := array_append(ids, v->>'id');
    sizes := array_append(sizes, v->>'size');
    total_stock := total_stock + (v->>'stock')::bigint;
    if new.product_format = 'beans' then
      if v->>'size' = '150g' then
        new.price_150g_original := (v->>'price')::integer;
        new.price_150g := coalesce((v->>'salePrice')::integer,(v->>'price')::integer);
      else
        new.price_400g_original := (v->>'price')::integer;
        new.price_400g := coalesce((v->>'salePrice')::integer,(v->>'price')::integer);
      end if;
    end if;
  end loop;
  if total_stock > 2147483647 then raise exception 'Inventory too large'; end if;
  if new.product_format = 'coffee_bag' then
    new.price_150g := 0;
    new.price_400g := 0;
    new.price_150g_original := null;
    new.price_400g_original := null;
    new.todays_roast := false;
  end if;

  new.stock_quantity := total_stock;
  new.sale_price := null;
  new.active := new.status in ('active','sold-out');
  if new.status is distinct from 'active' then new.todays_roast := false; end if;
  if new.todays_roast and (tg_op = 'INSERT' or not old.todays_roast) then
    update public.products set todays_roast = false where todays_roast and id <> new.id;
  end if;
  return new;
end $$;

-- Set the agreed selling prices. Keep this product hidden until stock is confirmed.
update public.products
set variants = jsonb_build_array(
  jsonb_build_object('id','coffee-bag-1','size','1개입','price',1800,'salePrice',null,'stock',0,'available',false),
  jsonb_build_object('id','coffee-bag-5','size','5개입','price',7900,'salePrice',null,'stock',0,'available',false),
  jsonb_build_object('id','coffee-bag-10','size','10개입','price',14900,'salePrice',null,'stock',0,'available',false)
), korean_name = coalesce(nullif(korean_name,''),'또미 블렌딩 커피백'),
short_description = coalesce(nullif(short_description,''),'일상 속에서 간편하게 즐기는 또미 블렌딩 커피백')
where slug='tomi-blend-coffee-bag' and product_format='coffee_bag'
  and status='draft' and jsonb_array_length(variants)=2
  and not exists (select 1 from jsonb_array_elements(variants) old
                  where coalesce((old->>'stock')::integer,0) > 0);

commit;
