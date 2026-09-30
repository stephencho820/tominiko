-- This follow-up must have a new migration id because an earlier version of
-- 202609290003 may already be recorded in deployed environments.
alter table public.products add column if not exists price_150g_original integer;

update public.products
set price_150g_original = 19000,
    price_150g = 13000,
    price_400g_original = 44000,
    price_400g = 29000,
    variants = coalesce((
      select jsonb_agg(
        variant.value || jsonb_build_object(
          'size', replace(lower(variant.value->>'size'), ' ', ''),
          'price', case replace(lower(variant.value->>'size'), ' ', '') when '400g' then 44000 else 19000 end,
          'salePrice', case replace(lower(variant.value->>'size'), ' ', '') when '400g' then 29000 else 13000 end
        ) order by variant.ordinality
      )
      from jsonb_array_elements(products.variants) with ordinality as variant(value, ordinality)
    ), '[]'::jsonb),
    sale_price = null,
    updated_at = now();
