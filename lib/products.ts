import type { Product, ProductVariant } from "@/types";
import { PRODUCT_SIZES, validateVariants, normalizeProductSize } from "@/lib/product-contract";

export const productImage = (product: Product) => product.primary_image_url || product.image_url || product.thumbnail_url || "/images/coffee-card-fallback.svg";
export const tastingNotes = (product: Product) => (product.tasting_notes ?? "").split(/[,/·]/).map((note) => note.trim()).filter(Boolean);

export { STANDARD_GRINDS, normalizeProductSize } from "@/lib/product-contract";
const DEFAULT_PRICES = {
  "150g": { price: 19000, salePrice: 13000 },
  "400g": { price: 44000, salePrice: 29000 },
} as const;
const finitePrice = (value: unknown, fallback = 0) => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : fallback;
};

const legacyPrices = (product: Product, size: string) => {
  const is400g = normalizeProductSize(size) === "400g";
  const defaults = is400g ? DEFAULT_PRICES["400g"] : DEFAULT_PRICES["150g"];
  let salePrice = finitePrice(is400g ? product.price_400g : product.price_150g, defaults.salePrice);
  let price = finitePrice(is400g ? product.price_400g_original : product.price_150g_original, defaults.price);
  if (is400g) {
    const price150 = finitePrice(product.price_150g_original, DEFAULT_PRICES["150g"].price);
    const sale150 = finitePrice(product.price_150g, DEFAULT_PRICES["150g"].salePrice);
    if (price <= price150) price = defaults.price;
    if (salePrice <= sale150) salePrice = defaults.salePrice;
  }
  return { price, salePrice: salePrice < price ? salePrice : null };
};

export function productPricing(product: Product, size: string, variant?: ProductVariant) {
  const normalizedSize = normalizeProductSize(size);
  const fallback = legacyPrices(product, normalizedSize);
  if (!variant) return fallback;
  const price = finitePrice(variant.price, fallback.price);
  const salePrice = variant.salePrice == null ? price : finitePrice(variant.salePrice, fallback.salePrice ?? price);
  return { price, salePrice: salePrice < price ? salePrice : null };
}

/** Retain disabled and empty tiers for the admin and sold-out storefront. */
export function inventoryVariants(product: Product): ProductVariant[] {
  try { return validateVariants(product.variants); } catch { /* Legacy cart snapshots only. */ }
  if (!Array.isArray(product.variants) || !product.variants.some((v) => v && "grindType" in v)) return [];
  return PRODUCT_SIZES.map((size) => {
    const legacy = (product.variants ?? []).filter((v) => normalizeProductSize(v.size) === size);
    const stock = legacy.length ? Math.min(Math.floor(Math.max(0, Number(product.stock_quantity) || 0) / 2), ...legacy.map((v) => Math.max(0, Math.trunc(Number(v.stock) || 0)))) : 0;
    return { id: size, size, ...legacyPrices(product, size), stock, available: legacy.length > 0 && legacy.every((v) => v.available === true) };
  });
}
export function productVariants(product: Product): ProductVariant[] {
  return inventoryVariants(product).map((variant) => ({ ...variant, available: variant.available && product.status === "active" && variant.stock > 0 }));
}
export function productIsSoldOut(product: Product) {
  return product.status === "sold-out" || !productVariants(product).some((v) => v.available);
}

export function productPrice(product: Product) {
  const prices = productVariants(product).map((variant) => finitePrice(variant.salePrice ?? variant.price)).filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : finitePrice(product.sale_price ?? product.price_150g);
}

export function defaultProductVariant(product: Product, preferredSize?: string, _preferredGrind?: string) {
  const available = productVariants(product).filter((variant) => variant.available && variant.stock > 0);
  const preferred = available.find((variant) => variant.size.toLowerCase() === preferredSize?.toLowerCase());
  if (preferred) return preferred;
  return available.reduce<ProductVariant | undefined>((cheapest, variant) => {
    if (!cheapest) return variant;
    return (variant.salePrice ?? variant.price) < (cheapest.salePrice ?? cheapest.price) ? variant : cheapest;
  }, undefined);
}
