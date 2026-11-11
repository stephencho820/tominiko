import { validateVariants } from "@/lib/product-contract";

export function synchronizeProductPricing(payload: Record<string, unknown>) {
  const format = payload.product_format === "coffee_bag" ? "coffee_bag" : "beans";
  const draft = format === "coffee_bag" && ["draft", "hidden"].includes(String(payload.status));
  const variants = validateVariants(payload.variants, format, draft);
  if (format === "coffee_bag") {
    // Legacy bean-only columns are intentionally unused for coffee bags.
    payload.price_150g = 0;
    payload.price_400g = 0;
    payload.price_150g_original = null;
    payload.price_400g_original = null;
    payload.todays_roast = false;
  } else {
    for (const variant of variants) {
      const prefix = variant.size === "150g" ? "price_150g" : "price_400g";
      payload[prefix + "_original"] = variant.price;
      payload[prefix] = variant.salePrice ?? variant.price;
    }
  }
  payload.stock_quantity = variants.reduce((sum, v) => sum + v.stock, 0);
  payload.sale_price = null;
  payload.variants = variants;
  return payload;
}
