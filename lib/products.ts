import type { Product, ProductVariant } from "@/types";
import { PRODUCT_SIZES, validateVariants, normalizeProductSize } from "@/lib/product-contract";

// Replace unrelated stock photography with a cohesive temporary product-label system.
// Uploaded first-party product photos still take priority when available.
const SAMPLE_PALETTE = ["#c9a891", "#b3b79e", "#b18f7d", "#b7aba0", "#d5b681", "#a8a3b1", "#a5b4a0", "#c5a5a0", "#a2a892", "#c8b6a6", "#9eaaa8"];
const escapeSvg = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
function coffeeArtwork(product: Product) {
  const slug = product.slug || product.name;
  const index = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % SAMPLE_PALETTE.length;
  const accent = SAMPLE_PALETTE[index];
  const title = escapeSvg(product.korean_name || product.name);
  const subtitle = escapeSvg((product.origin || "SPECIALTY COFFEE").toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="960" viewBox="0 0 800 960">
  <rect width="800" height="960" fill="#eeeae2"/>
  <rect x="36" y="36" width="728" height="888" rx="3" fill="#e9e2d6"/>
  <ellipse cx="400" cy="837" rx="225" ry="32" fill="#5c4a3c" opacity=".12"/>
  <path d="M252 180 L548 180 L585 793 Q400 818 215 793 Z" fill="#f9f5ea" stroke="#d4c8b6" stroke-width="3"/>
  <path d="M252 180 L548 180 L535 220 L265 220 Z" fill="#e7dfd0"/>
  <path d="M252 180 L548 180" stroke="#bdb09c" stroke-width="9"/>
  <rect x="250" y="360" width="300" height="310" rx="2" fill="${accent}"/>
  <text x="400" y="291" font-family="Georgia,serif" font-size="36" letter-spacing="7" text-anchor="middle" fill="#332c26">TOMINIKO</text>
  <text x="400" y="318" font-family="Arial,sans-serif" font-size="12" letter-spacing="3.2" text-anchor="middle" fill="#6b6055">COFFEE ROASTERS</text>
  <circle cx="400" cy="425" r="24" fill="none" stroke="#55483c" stroke-width="2"/>
  <path d="M397 410 Q414 425 398 441 Q384 429 397 410Z" fill="#55483c"/>
  <text x="400" y="507" font-family="Arial,sans-serif" font-weight="600" font-size="26" text-anchor="middle" fill="#302923" textLength="250" lengthAdjust="spacingAndGlyphs">${title}</text>
  <text x="400" y="554" font-family="Arial,sans-serif" font-size="14" letter-spacing="1.4" text-anchor="middle" fill="#433a32" textLength="240" lengthAdjust="spacingAndGlyphs">${subtitle}</text>
  <line x1="325" y1="586" x2="475" y2="586" stroke="#62574e" stroke-width="1"/>
  <text x="400" y="618" font-family="Georgia,serif" font-style="italic" font-size="18" text-anchor="middle" fill="#443a32">Freshly roasted coffee</text>
  <text x="400" y="738" font-family="Arial,sans-serif" font-size="12" letter-spacing="3" text-anchor="middle" fill="#756b5d">CASA DI STEFANO</text>
  <text x="400" y="895" font-family="Arial,sans-serif" font-size="12" letter-spacing="4" text-anchor="middle" fill="#776a5c">PRODUCT IMAGE · SAMPLE</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
export const productImage = (product: Product) => {
  const image = product.primary_image_url || product.image_url || product.thumbnail_url;
  if (image && !image.includes("images.unsplash.com/")) return image;
  return coffeeArtwork(product);
};
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

export function defaultProductVariant(product: Product, preferredSize = "150g", _preferredGrind?: string) {
  const variants = productVariants(product);
  const available = variants.filter((variant) => variant.available && variant.stock > 0);
  return available.find((variant) => variant.size === normalizeProductSize(preferredSize))
    ?? available[0]
    ?? variants.find((variant) => variant.size === normalizeProductSize(preferredSize))
    ?? variants[0];
}
