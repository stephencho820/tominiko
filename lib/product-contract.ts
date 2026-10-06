import type { ProductVariant } from "../types";

export const PRODUCT_SIZES = ["150g", "400g"] as const;
export const PRODUCT_GRINDS = ["Whole Bean", "Filter", "Espresso"] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];
export type ProductGrind = (typeof PRODUCT_GRINDS)[number];

export function canonicalSize(value: unknown): ProductSize | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, "") : "";
  return PRODUCT_SIZES.find((size) => size.toLowerCase() === normalized) ?? null;
}

export function canonicalGrind(value: unknown): ProductGrind | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "pour over") return "Filter";
  return PRODUCT_GRINDS.find((grind) => grind.toLowerCase() === normalized) ?? null;
}

export function variantKey(variant: Pick<ProductVariant, "size">) {
  return canonicalSize(variant.size) ?? variant.size;
}

export function validateCanonicalVariants(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return "Add at least one sellable option";
  const seen = new Set<string>(); const seenIds = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return "Every option must be an object";
    const variant = raw as Partial<ProductVariant>;
    const size = canonicalSize(variant.size);
    if (typeof variant.id !== "string" || !variant.id.trim() || !size || (variant.sku != null && typeof variant.sku !== "string")) return "Every option must use a valid id and supported size";
    const price = Number(variant.price); const salePrice = variant.salePrice == null ? null : Number(variant.salePrice); const stock = Number(variant.stock);
    if (!Number.isInteger(price) || price <= 0 || (salePrice !== null && (!Number.isInteger(salePrice) || salePrice <= 0 || salePrice > price)) || !Number.isInteger(stock) || stock < 0 || typeof variant.available !== "boolean") return "Every option needs a valid price, sale price, stock, and availability";
    const key = size;
    if (seen.has(key)) return `Duplicate option: ${size}`;
    if (seenIds.has(variant.id)) return `Duplicate variant id: ${variant.id}`;
    seen.add(key); seenIds.add(variant.id);
  }
  if (seen.size !== PRODUCT_SIZES.length || PRODUCT_SIZES.some((size) => !seen.has(size))) return "Both 150g and 400g options are required";
  return null;
}

export function canonicalizeVariants(value: ProductVariant[]) {
  return value.map((variant) => ({ ...variant, size: canonicalSize(variant.size)! }));
}

export function variantStockTotal(value: unknown) {
  return Array.isArray(value) ? value.reduce((sum, raw) => sum + Math.max(0, Math.trunc(Number((raw as { stock?: unknown })?.stock) || 0)), 0) : 0;
}
