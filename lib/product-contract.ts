import type { Grind, ProductVariant, Weight } from "@/types";

export const PRODUCT_SIZES = ["150g", "400g"] as const;
export const COFFEE_BAG_SIZES = ["5개입", "10개입"] as const;
export const STANDARD_GRINDS = ["Whole Bean", "Filter", "Espresso"] as const;
export const normalizeProductSize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");
export const isSize = (value: unknown): value is Weight => typeof value === "string" && [...PRODUCT_SIZES, ...COFFEE_BAG_SIZES].some((size) => size === value);
export const validVariantId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
export function normalizeGrind(value: unknown): Grind | undefined {
  const grind = value === "Pour Over" ? "Filter" : value;
  return typeof grind === "string" && (grind === "Coffee Bag" || STANDARD_GRINDS.some((value) => value === grind)) ? grind as Grind : undefined;
}
export function validateVariants(value: unknown, format: "beans" | "coffee_bag" = "beans", draft = false): ProductVariant[] {
  const expected = format === "coffee_bag" ? COFFEE_BAG_SIZES : PRODUCT_SIZES;
  if (!Array.isArray(value) || value.length !== expected.length) throw new Error("Required product options are missing");
  const ids = new Set<string>(), sizes = new Set<string>();
  const variants: ProductVariant[] = value.map((variant) => {
    if (!variant || !validVariantId(variant.id) || !expected.some(size => size === variant.size) || ids.has(variant.id) || sizes.has(variant.size) ||
        !Number.isSafeInteger(variant.price) || variant.price < (format === "coffee_bag" && draft ? 0 : 1) || variant.price > 2147483647 ||
        (variant.salePrice != null && (!Number.isSafeInteger(variant.salePrice) || variant.salePrice <= 0 || variant.salePrice > variant.price)) ||
        !Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 2147483647 || typeof variant.available !== "boolean" ||
        (variant.price === 0 && (variant.stock > 0 || variant.available))) throw new Error("Invalid size inventory id, size, price, stock or availability");
    ids.add(variant.id); sizes.add(variant.size);
    return { id: variant.id, size: variant.size, price: variant.price, salePrice: variant.salePrice ?? null, stock: variant.stock, available: variant.available };
  });
  if (sizes.size !== expected.length) throw new Error("Both options must be included");
  return variants;
}
