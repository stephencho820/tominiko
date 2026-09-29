import type { ProductVariant } from "@/types";

const positiveInteger = (value: unknown) => Number.isInteger(value) && Number(value) > 0;

/**
 * Variants are the admin's single source of truth. The two legacy price
 * columns are maintained here only for older views and the checkout fallback,
 * so every consumer receives the same price after one admin edit.
 */
export function synchronizeProductPricing(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.variants) || payload.variants.length === 0) {
    throw new Error("Add at least one sellable option");
  }

  const variants = payload.variants as Partial<ProductVariant>[];
  for (const variant of variants) {
    if (!variant.id || !variant.size || !variant.grindType || !positiveInteger(variant.price) ||
        !Number.isInteger(variant.stock) || Number(variant.stock) < 0 ||
        (variant.salePrice != null && variant.salePrice !== 0 && !positiveInteger(variant.salePrice))) {
      throw new Error("Every option needs an id, size, grind, positive price, and valid stock");
    }
  }

  const effectivePrices = new Map<string, number>();
  for (const variant of variants) {
    const size = variant.size!.trim().toLowerCase();
    const effectivePrice = Number(variant.salePrice || variant.price);
    if (effectivePrices.has(size) && effectivePrices.get(size) !== effectivePrice) {
      throw new Error("Options of the same size must have the same price");
    }
    effectivePrices.set(size, effectivePrice);
  }

  const priceFor = (size: string) => effectivePrices.get(size);
  const price150 = priceFor("150g");
  const price400 = priceFor("400g");
  if (price150 != null) payload.price_150g = price150;
  if (price400 != null) payload.price_400g = price400;
  payload.sale_price = null;
  payload.variants = variants.map((variant) => ({ ...variant, salePrice: variant.salePrice || null }));
  return payload;
}
