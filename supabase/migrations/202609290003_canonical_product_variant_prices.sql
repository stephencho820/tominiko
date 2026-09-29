-- Product variants are the editing source of truth. Repair the known zero-price
-- variant data, then keep the legacy tier columns as checkout-compatible
-- projections of the effective variant prices.
update public.products p
set variants = repaired.variants,
    updated_at = now()
from (
  select product.id,
    jsonb_agg(
      case
        when coalesce((variant.value->>'price')::integer, 0) <= 0
          then jsonb_set(
            variant.value,
            '{price}',
            to_jsonb(case lower(variant.value->>'size')
              when '400g' then product.price_400g
              else product.price_150g
            end)
          )
        else variant.value
      end
      order by variant.ordinality
    ) as variants
  from public.products product
  cross join lateral jsonb_array_elements(product.variants) with ordinality as variant(value, ordinality)
  group by product.id
) repaired
where p.id = repaired.id;

-- Ensure both legacy columns follow the canonical variants. These columns are
-- retained because the current atomic order function reads them server-side.
update public.products p
set price_150g = coalesce(prices.price_150g, p.price_150g),
    price_400g = coalesce(prices.price_400g, p.price_400g),
    updated_at = now()
from (
  select product.id,
    min(coalesce(nullif((variant.value->>'salePrice')::integer, 0), (variant.value->>'price')::integer))
      filter (where lower(variant.value->>'size') = '150g') as price_150g,
    min(coalesce(nullif((variant.value->>'salePrice')::integer, 0), (variant.value->>'price')::integer))
      filter (where lower(variant.value->>'size') = '400g') as price_400g
  from public.products product
  cross join lateral jsonb_array_elements(product.variants) as variant(value)
  group by product.id
) prices
where p.id = prices.id;

alter table public.products drop constraint if exists products_price_150g_positive;
alter table public.products add constraint products_price_150g_positive check (price_150g > 0);
alter table public.products drop constraint if exists products_price_400g_positive;
alter table public.products add constraint products_price_400g_positive check (price_400g > 0);
