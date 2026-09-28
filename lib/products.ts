import type { Product, ProductVariant } from "@/types";

export const productImage = (product: Product) => product.primary_image_url || product.image_url || product.thumbnail_url || "/images/coffee-card-fallback.svg";
export const tastingNotes = (product: Product) => (product.tasting_notes ?? "").split(/[,/·]/).map((note) => note.trim()).filter(Boolean);

export function productVariants(product: Product): ProductVariant[] {
  if (product.variants?.length) return product.variants.filter((variant) => variant.available);
  const grinds = ["Whole Bean", "Pour Over", "Espresso"] as const;
  return [
    ...grinds.map((grindType) => ({ id: `150g-${grindType}`, size: "150g", grindType, price: product.price_150g, stock: product.stock_quantity, available: true })),
    ...grinds.map((grindType) => ({ id: `400g-${grindType}`, size: "400g", grindType, price: product.price_400g, salePrice: product.price_400g_original ? product.price_400g : null, stock: product.stock_quantity, available: true })),
  ];
}

export function productPrice(product: Product) {
  const variants = productVariants(product);
  return variants.length ? Math.min(...variants.map((variant) => variant.salePrice ?? variant.price)) : product.sale_price ?? product.price_150g;
}
