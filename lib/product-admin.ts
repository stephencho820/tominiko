import { validateVariants } from "@/lib/product-contract";

export function synchronizeProductPricing(payload: Record<string, unknown>) {
  const variants = validateVariants(payload.variants);
  for (const variant of variants) {
    const prefix = variant.size === "150g" ? "price_150g" : "price_400g";
    payload[prefix + "_original"] = variant.price;
    payload[prefix] = variant.salePrice ?? variant.price;
  }
  payload.stock_quantity = variants.reduce((sum, v) => sum + v.stock, 0);
  payload.sale_price = null;
  payload.variants = variants;
  return payload;
}
