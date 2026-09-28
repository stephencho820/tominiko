import type { CartItem, Grind, Product, Weight } from "@/types";

const weights = new Set<Weight>(["150g", "400g"]);
const grinds = new Set<Grind>(["Whole Bean", "Filter", "Espresso"]);

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<Product>;
  return typeof product.id === "string" && typeof product.name === "string" &&
    Number.isInteger(product.price_150g) && Number(product.price_150g) >= 0 &&
    Number.isInteger(product.price_400g) && Number(product.price_400g) >= 0 &&
    Number.isInteger(product.stock_quantity) && Number(product.stock_quantity) >= 0;
}

export function itemPrice(product: Product, weight: Weight) {
  return weight === "150g" ? product.price_150g : product.price_400g;
}

export function maxCartQuantity(item: Pick<CartItem, "product">) {
  return Math.min(20, Math.max(0, item.product.stock_quantity));
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<CartItem>;
    if (!isProduct(item.product) || !weights.has(item.weight as Weight) || !grinds.has(item.grind as Grind)) return [];
    const quantity = Math.min(20, item.product.stock_quantity, Math.max(1, Number(item.quantity)));
    if (!Number.isInteger(quantity) || quantity < 1) return [];
    const weight = item.weight as Weight;
    return [{ product: item.product, weight, grind: item.grind as Grind, quantity, unitPrice: itemPrice(item.product, weight) }];
  });
}
