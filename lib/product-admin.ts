import type { ProductVariant } from "../types";
import { canonicalizeVariants, validateCanonicalVariants, variantStockTotal } from "./product-contract";

/**
 * Variants are the admin's single source of truth. The two legacy price
 * columns are maintained here only for older views and the checkout fallback,
 * so every consumer receives the same price after one admin edit.
 */
export function synchronizeProductPricing(payload: Record<string, unknown>) {
  const invalid = validateCanonicalVariants(payload.variants);
  if (invalid) throw new Error(invalid);
  const variants = canonicalizeVariants(payload.variants as ProductVariant[]);

  const prices = new Map<string, { regular: number; sale: number }>();
  for (const variant of variants) {
    const size = variant.size!.trim().toLowerCase();
    const value = { regular: Number(variant.price), sale: Number(variant.salePrice || variant.price) };
    const existing = prices.get(size);
    if (existing && (existing.regular !== value.regular || existing.sale !== value.sale)) {
      throw new Error("Options of the same size must have the same price");
    }
    prices.set(size, value);
  }

  const priceFor = (size: string) => prices.get(size);
  const price150 = priceFor("150g");
  const price400 = priceFor("400g");
  if (price150) { payload.price_150g_original = price150.regular; payload.price_150g = price150.sale; }
  if (price400) { payload.price_400g_original = price400.regular; payload.price_400g = price400.sale; }
  payload.sale_price = null;
  payload.variants = variants.map((variant) => ({ ...variant, salePrice: variant.salePrice || null }));
  // Compatibility only: checkout and fulfillment use each variant's stock.
  payload.stock_quantity = variantStockTotal(payload.variants);
  return payload;
}
