-- Product variants are the editing source of truth. The launch promotion is
-- 150g ₩19,000 -> ₩13,000 and 400g ₩44,000 -> ₩29,000.
alter table public.products add column if not exists price_150g_original integer;

update public.products
set price_150g_original = 19000,
    price_150g = 13000,
    price_400g_original = 44000,
    price_400g = 29000,
    variants = coalesce((
      select jsonb_agg(
        variant.value || jsonb_build_object(
          'price', case lower(variant.value->>'size') when '400g' then 44000 else 19000 end,
          'salePrice', case lower(variant.value->>'size') when '400g' then 29000 else 13000 end
        ) order by variant.ordinality
      )
      from jsonb_array_elements(products.variants) with ordinality as variant(value, ordinality)
    ), '[]'::jsonb),
    sale_price = null,
    updated_at = now();

alter table public.products drop constraint if exists products_price_150g_positive;
alter table public.products add constraint products_price_150g_positive check (price_150g > 0);
alter table public.products drop constraint if exists products_price_150g_original_positive;
alter table public.products add constraint products_price_150g_original_positive check (price_150g_original > 0);
alter table public.products drop constraint if exists products_price_400g_positive;
alter table public.products add constraint products_price_400g_positive check (price_400g > 0);
alter table public.products drop constraint if exists products_price_400g_original_positive;
alter table public.products add constraint products_price_400g_original_positive check (price_400g_original > 0);
