import type { Product, ProductVariant } from "@/types";
import { canonicalSize, PRODUCT_GRINDS, PRODUCT_SIZES } from "@/lib/product-contract";

export const productImage = (product: Product) => product.primary_image_url || product.image_url || product.thumbnail_url || "/images/coffee-card-fallback.svg";
export const tastingNotes = (product: Product) => (product.tasting_notes ?? "").split(/[,/·]/).map((note) => note.trim()).filter(Boolean);

export const STANDARD_GRINDS = PRODUCT_GRINDS;
export const normalizeProductSize = (value: string) => canonicalSize(value) ?? value.trim().toLowerCase().replace(/\s+/g, "");
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
  const isBroken400g = normalizedSize === "400g" &&
    (price <= finitePrice(product.price_150g_original, DEFAULT_PRICES["150g"].price) ||
      salePrice <= finitePrice(product.price_150g, DEFAULT_PRICES["150g"].salePrice));
  return isBroken400g ? fallback : { price, salePrice: salePrice < price ? salePrice : null };
}

export function productIsSoldOut(product: Product) {
  return product.status === "sold-out" || (product.variants?.length ? !product.variants.some((variant) => variant.available && variant.stock > 0) : Number(product.stock_quantity) <= 0);
}

export function productVariants(product: Product): ProductVariant[] {
  const soldOut = productIsSoldOut(product);
  if (product.variants?.length) return product.variants.flatMap((variant) => {
    // Older catalogue rows can contain a generated variant with price 0. A
    // zero-priced option must never reach the storefront; recover it from the
    // matching legacy tier until the data migration has repaired the row.
    const { price, salePrice } = productPricing(product, variant.size, variant);
    const stock = Math.max(0, Math.trunc(Number(variant.stock) || 0));
    const size = canonicalSize(variant.size);
    return variant.id && size && variant.available
      ? [{ ...variant, size, price, salePrice, stock, available: !soldOut && stock > 0 }]
      : [];
  });
  const stock = Math.max(0, Math.trunc(Number(product.stock_quantity) || 0));
  const available = !soldOut && stock > 0;
  return [
    ...PRODUCT_SIZES.map((size, index) => ({ id: size, size, ...legacyPrices(product, size), stock: Math.floor(stock / PRODUCT_SIZES.length) + (index < stock % PRODUCT_SIZES.length ? 1 : 0), available })),
  ];
}

export function productPrice(product: Product) {
  const prices = productVariants(product).map((variant) => finitePrice(variant.salePrice ?? variant.price)).filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : finitePrice(product.sale_price ?? product.price_150g);
}

export function defaultProductVariant(product: Product, preferredSize?: string, preferredGrind?: string) {
  const available = productVariants(product).filter((variant) => variant.available && variant.stock > 0);
  const preferred = available.find((variant) => variant.size.toLowerCase() === preferredSize?.toLowerCase());
  if (preferred) return preferred;
  return available.reduce<ProductVariant | undefined>((cheapest, variant) => {
    if (!cheapest) return variant;
    return (variant.salePrice ?? variant.price) < (cheapest.salePrice ?? cheapest.price) ? variant : cheapest;
  }, undefined);
}
