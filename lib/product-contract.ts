import type { Grind, ProductVariant, Weight } from "@/types";

export const PRODUCT_SIZES = ["150g", "400g"] as const;
export const COFFEE_BAG_SIZES = ["1개입", "5개입", "10개입"] as const;
export const BUNDLE_SIZES = ["1세트"] as const;
export type ProductFormat = "beans" | "coffee_bag" | "bundle";
export const STANDARD_GRINDS = ["Whole Bean", "Filter", "Espresso"] as const;
export const normalizeProductSize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");
export const sizesForFormat = (format: ProductFormat = "beans"): readonly Weight[] => format === "coffee_bag" ? COFFEE_BAG_SIZES : format === "bundle" ? BUNDLE_SIZES : PRODUCT_SIZES;
export const isSize = (value: unknown): value is Weight => typeof value === "string" && [...PRODUCT_SIZES, ...COFFEE_BAG_SIZES, ...BUNDLE_SIZES].includes(value as Weight);
export const validVariantId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
export function normalizeGrind(value: unknown): Grind | undefined {
  const grind = value === "Pour Over" ? "Filter" : value;
  return STANDARD_GRINDS.includes(grind as Grind) ? grind as Grind : undefined;
}
export function validateVariants(value: unknown, format: ProductFormat = "beans"): ProductVariant[] {
  const expectedSizes = sizesForFormat(format);
  if (!Array.isArray(value) || value.length !== expectedSizes.length) throw new Error(`Exactly ${expectedSizes.join(", ")} inventory options are required`);
  const ids = new Set<string>(); const sizes = new Set<string>();
  return value.map((variant) => {
    if (!variant || !validVariantId(variant.id) || !expectedSizes.includes(variant.size) || ids.has(variant.id) || sizes.has(variant.size) ||
        !Number.isSafeInteger(variant.price) || variant.price <= 0 || variant.price > 2147483647 ||
        (variant.salePrice != null && (!Number.isSafeInteger(variant.salePrice) || variant.salePrice <= 0 || variant.salePrice > variant.price)) ||
        !Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 2147483647 || typeof variant.available !== "boolean") {
      throw new Error("Invalid inventory id, option, price, stock or availability");
    }
    ids.add(variant.id); sizes.add(variant.size);
    return { id: variant.id, size: variant.size, price: variant.price, salePrice: variant.salePrice ?? null, stock: variant.stock, available: variant.available };
  });
}
