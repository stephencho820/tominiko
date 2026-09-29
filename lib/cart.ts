import { productVariants } from "@/lib/products";
import type { CartItem, Grind, Product, Weight } from "@/types";

const grinds = new Set<Grind>(["Whole Bean", "Filter", "Espresso", "Moka Pot", "Pour Over", "Coffee Maker", "French Press", "Other"]);

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<Product>;
  return typeof product.id === "string" && typeof product.name === "string" &&
    Number.isInteger(product.price_150g) && Number(product.price_150g) >= 0 &&
    Number.isInteger(product.price_400g) && Number(product.price_400g) >= 0 &&
    Number.isInteger(product.stock_quantity) && Number(product.stock_quantity) >= 0;
}

export function itemPrice(product: Product, weight: Weight) {
  const variant = productVariants(product).find((item) => item.size === weight);
  return variant ? variant.salePrice ?? variant.price : weight === "150g" ? product.price_150g : product.price_400g;
}

export function maxCartQuantity(item: Pick<CartItem, "product">) {
  return Math.min(20, Math.max(0, item.product.stock_quantity));
}

/** A stable identity for a product option. This deliberately includes both the
 * product and variant so future sizes/grinds remain separate cart lines. */
export function cartItemKey(item: Pick<CartItem, "product" | "variantId" | "weight" | "grind">) {
  return [item.product.id, item.variantId || item.weight, item.grind].join("::");
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<CartItem>;
    if (!isProduct(item.product) || typeof item.weight !== "string" || !item.weight || !grinds.has(item.grind as Grind)) return [];
    const quantity = Math.min(20, item.product.stock_quantity, Math.max(1, Number(item.quantity)));
    if (!Number.isInteger(quantity) || quantity < 1) return [];
    const weight = item.weight as Weight;
    const variant = productVariants(item.product).find((value) => value.id === item.variantId || (value.size === weight && value.grindType === item.grind));
    if (!variant) return [];
    return [{ product: item.product, variantId: variant.id, weight, grind: variant.grindType, quantity, unitPrice: variant.salePrice ?? variant.price }];
  });
}
