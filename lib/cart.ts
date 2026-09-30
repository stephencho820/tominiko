import { normalizeProductSize, productVariants } from "@/lib/products";
import type { CartItem, Product, Weight } from "@/types";

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<Product>;
  // A cart line with a custom variant does not depend on the legacy 150g/400g
  // price columns. Production contains products created before those fields
  // were required, so rejecting the whole line here made ADD TO CART appear to
  // succeed while sanitizeCart silently discarded it.
  return typeof product.id === "string" && Boolean(product.id) &&
    typeof product.name === "string" && Boolean(product.name) &&
    Number.isFinite(Number(product.stock_quantity)) && Number(product.stock_quantity) >= 0;
}

export function itemPrice(product: Product, weight: Weight) {
  const variant = productVariants(product).find((item) => normalizeProductSize(item.size) === normalizeProductSize(weight));
  return variant ? variant.salePrice ?? variant.price : weight === "150g" ? product.price_150g : product.price_400g;
}

export function cartItemRegularPrice(item: Pick<CartItem, "product" | "variantId" | "weight" | "grind" | "unitPrice">) {
  const variant = productVariants(item.product).find((value) => value.id === item.variantId)
    ?? productVariants(item.product).find((value) => normalizeProductSize(value.size) === normalizeProductSize(item.weight) && value.grindType === item.grind);
  return variant?.price ?? item.unitPrice;
}

export function maxCartQuantity(item: Pick<CartItem, "product" | "variantId" | "weight" | "grind">) {
  const variant = productVariants(item.product).find((value) => value.id === item.variantId || (normalizeProductSize(value.size) === normalizeProductSize(item.weight) && value.grindType === item.grind));
  return Math.min(20, Math.max(0, Number(variant?.stock ?? item.product.stock_quantity) || 0));
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
    if (!isProduct(item.product) || typeof item.weight !== "string" || !item.weight || typeof item.grind !== "string" || !item.grind.trim()) return [];
    const weight = item.weight as Weight;
    const variant = productVariants(item.product).find((value) => value.id === item.variantId || (normalizeProductSize(value.size) === normalizeProductSize(weight) && value.grindType === item.grind));
    if (!variant) return [];
    // Grind labels are editable in the product admin. The selected variant is
    // the source of truth, so do not silently reject otherwise valid custom or
    // localized labels (for example, "핸드드립") at the cart boundary.
    const quantity = Math.min(20, Number(variant.stock), Math.max(1, Number(item.quantity)));
    if (!Number.isInteger(quantity) || quantity < 1 || !variant.available) return [];
    return [{ product: item.product, variantId: variant.id, weight: variant.size, grind: variant.grindType, quantity, unitPrice: variant.salePrice ?? variant.price }];
  });
}
