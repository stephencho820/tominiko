import type { Grind, ProductVariant, Weight } from "@/types";

export const PRODUCT_SIZES = ["150g", "400g"] as const;
export const STANDARD_GRINDS = ["Whole Bean", "Filter", "Espresso"] as const;
export const normalizeProductSize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");
export const isSize = (value: unknown): value is Weight => PRODUCT_SIZES.includes(value as Weight);
export const validVariantId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
export function normalizeGrind(value: unknown): Grind | undefined {
  const grind = value === "Pour Over" ? "Filter" : value;
  return STANDARD_GRINDS.includes(grind as Grind) ? grind as Grind : undefined;
}
export function validateVariants(value: unknown): ProductVariant[] {
  if (!Array.isArray(value) || value.length !== 2) throw new Error("Exactly 150g and 400g inventory are required");
  const ids = new Set<string>(); const sizes = new Set<string>();
  return value.map((variant) => {
    if (!variant || !validVariantId(variant.id) || !isSize(variant.size) || ids.has(variant.id) || sizes.has(variant.size) ||
        !Number.isSafeInteger(variant.price) || variant.price <= 0 || variant.price > 2147483647 ||
        (variant.salePrice != null && (!Number.isSafeInteger(variant.salePrice) || variant.salePrice <= 0 || variant.salePrice > variant.price)) ||
        !Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 2147483647 || typeof variant.available !== "boolean") {
      throw new Error("Invalid size inventory id, size, price, stock or availability");
    }
    ids.add(variant.id); sizes.add(variant.size);
    return { id: variant.id, size: variant.size, price: variant.price, salePrice: variant.salePrice ?? null, stock: variant.stock, available: variant.available };
  });
}
