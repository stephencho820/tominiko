import type { Product, ProductVariant } from "@/types";

export const productImage = (product: Product) => product.primary_image_url || product.image_url || product.thumbnail_url || "/images/coffee-card-fallback.svg";
export const tastingNotes = (product: Product) => (product.tasting_notes ?? "").split(/[,/·]/).map((note) => note.trim()).filter(Boolean);

export const STANDARD_GRINDS = ["Whole Bean", "Pour Over", "Espresso"] as const;
export const normalizeProductSize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");
const finitePrice = (value: unknown, fallback = 0) => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : fallback;
};

const legacyPrices = (product: Product, size: string) => {
  const is400g = normalizeProductSize(size) === "400g";
  const salePrice = finitePrice(is400g ? product.price_400g : product.price_150g);
  const price = finitePrice(is400g ? product.price_400g_original : product.price_150g_original, salePrice);
  return { price, salePrice: salePrice < price ? salePrice : null };
};

const legacyPrices = (product: Product, size: string) => {
  const is400g = size.toLowerCase() === "400g";
  const salePrice = finitePrice(is400g ? product.price_400g : product.price_150g);
  const price = finitePrice(is400g ? product.price_400g_original : product.price_150g_original, salePrice);
  return { price, salePrice: salePrice < price ? salePrice : null };
};

const legacyPrice = (product: Product, size: string) => size.toLowerCase() === "400g"
  ? finitePrice(product.price_400g, finitePrice(product.price_150g))
  : finitePrice(product.price_150g);

export function productIsSoldOut(product: Product) {
  return product.status === "sold-out" || Number(product.stock_quantity) <= 0;
}

export function productVariants(product: Product): ProductVariant[] {
  const soldOut = productIsSoldOut(product);
  if (product.variants?.length) return product.variants.flatMap((variant) => {
    // Older catalogue rows can contain a generated variant with price 0. A
    // zero-priced option must never reach the storefront; recover it from the
    // matching legacy tier until the data migration has repaired the row.
    const fallback = legacyPrices(product, variant.size);
    const price = finitePrice(variant.price, fallback.price);
    const salePrice = variant.salePrice == null ? null : finitePrice(variant.salePrice, price);
    const stock = Math.max(0, Math.trunc(Number(variant.stock) || 0));
    const size = normalizeProductSize(variant.size);
    return variant.id && size && variant.grindType && variant.available
      ? [{ ...variant, size, price, salePrice, stock, available: !soldOut && stock > 0 }]
      : [];
  });
  const stock = Math.max(0, Math.trunc(Number(product.stock_quantity) || 0));
  const available = !soldOut && stock > 0;
  return [
    ...STANDARD_GRINDS.map((grindType) => ({ id: `150g-${grindType}`, size: "150g", grindType, ...legacyPrices(product, "150g"), stock, available })),
    ...STANDARD_GRINDS.map((grindType) => ({ id: `400g-${grindType}`, size: "400g", grindType, ...legacyPrices(product, "400g"), stock, available })),
  ];
}

export function productPrice(product: Product) {
  const prices = productVariants(product).map((variant) => finitePrice(variant.salePrice ?? variant.price)).filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : finitePrice(product.sale_price ?? product.price_150g);
}

export function defaultProductVariant(product: Product, preferredSize?: string, preferredGrind?: string) {
  const available = productVariants(product).filter((variant) => variant.available && variant.stock > 0);
  const preferred = available.find((variant) => variant.size.toLowerCase() === preferredSize?.toLowerCase() && variant.grindType === preferredGrind);
  if (preferred) return preferred;
  return available.reduce<ProductVariant | undefined>((cheapest, variant) => {
    if (!cheapest) return variant;
    return (variant.salePrice ?? variant.price) < (cheapest.salePrice ?? cheapest.price) ? variant : cheapest;
  }, undefined);
}
