import { normalizeGrind, isSize } from "@/lib/product-contract";
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
    ?? productVariants(item.product).find((value) => normalizeProductSize(value.size) === normalizeProductSize(item.weight));
  return variant?.price ?? item.unitPrice;
}

export function maxCartQuantity(item: Pick<CartItem, "product" | "variantId" | "weight" | "grind">, items: CartItem[] = []) {
  const variant = productVariants(item.product).find((value) => value.id === item.variantId || (normalizeProductSize(value.size) === normalizeProductSize(item.weight)));
  const used = items.filter((v) => v.product.id === item.product.id && normalizeProductSize(v.weight) === variant?.size && cartItemKey(v) !== cartItemKey(item)).reduce((sum, v) => sum + v.quantity, 0);
  return Math.max(0, Math.min(20, Number(variant?.stock) || 0) - used);
}

/** A stable identity for a product option. This deliberately includes both the
 * product and variant so future sizes/grinds remain separate cart lines. */
export function cartItemKey(item: Pick<CartItem, "product" | "variantId" | "weight" | "grind">) {
  return [item.product.id, item.variantId || item.weight, item.grind].join("::");
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const result = value.flatMap((entry): CartItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<CartItem>;
    if (!isProduct(item.product) || typeof item.weight !== "string" || !item.weight || typeof item.grind !== "string" || !item.grind.trim()) return [];
    const weight = normalizeProductSize(item.weight);
    const grind = normalizeGrind(item.grind);
    if (!isSize(weight) || !grind) return [];
    const legacySnapshot = item.product.variants?.some((v) => v && "grindType" in v) === true;
    const variant = productVariants(item.product).find((value) => value.size === weight && (value.id === item.variantId || legacySnapshot));
    if (!variant) return [];
    const quantity = Math.min(20, Number(variant.stock), Math.max(1, Number(item.quantity)));
    if (!Number.isInteger(quantity) || quantity < 1 || !variant.available) return [];
    return [{ product: item.product, variantId: variant.id, weight: variant.size, grind, quantity, unitPrice: variant.salePrice ?? variant.price }];
  });
  const accepted: CartItem[] = [];
  for (const item of result) {
    const used = accepted.filter((v) => v.product.id === item.product.id && v.variantId === item.variantId).reduce((sum, v) => sum + v.quantity, 0);
    const quantity = Math.min(item.quantity, maxCartQuantity(item) - used);
    if (quantity > 0) {
      const duplicate = accepted.find((v) => cartItemKey(v) === cartItemKey(item));
      if (duplicate) duplicate.quantity += quantity;
      else accepted.push({ ...item, quantity });
    }
  }
  return accepted;
}

/** Refresh every line from the same server snapshot before reapplying shared-size limits. */
export function refreshCartProducts(items: CartItem[], products: Product[]): CartItem[] {
  const currentProducts = new Map(products.map((product) => [product.id, product]));
  return sanitizeCart(items.flatMap((item) => {
    const product = currentProducts.get(item.product.id);
    if (!product || !["active", "sold-out"].includes(product.status ?? "")) return [];
    const variant = productVariants(product).find((value) => value.id === item.variantId && value.size === item.weight)
      ?? productVariants(product).find((value) => value.size === item.weight);
    if (!variant?.available) return [];
    return [{ ...item, product, variantId: variant.id, weight: variant.size }];
  }));
}

export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  const safeItem = sanitizeCart([item])[0];
  if (!safeItem) return items;
  const existing = items.find((value) => cartItemKey(value) === cartItemKey(safeItem));
  if (safeItem.quantity + (existing?.quantity ?? 0) > maxCartQuantity(safeItem, items)) return items;
  return sanitizeCart(existing
    ? items.map((value) => value === existing ? { ...safeItem, quantity: value.quantity + safeItem.quantity } : value)
    : [...items, safeItem]);
}

export function updateCartOptions(items: CartItem[], index: number, options: Partial<Pick<CartItem, "variantId" | "weight" | "grind">>): CartItem[] {
  const item = items[index];
  if (!item) return items;
  const variant = productVariants(item.product).find((value) => value.id === options.variantId)
    ?? productVariants(item.product).find((value) => value.size === normalizeProductSize(options.weight ?? item.weight));
  const grind = normalizeGrind(options.grind ?? item.grind);
  if (!variant?.available || !grind) return items;
  const others = items.filter((_, i) => i !== index);
  const used = others.filter((value) => value.product.id === item.product.id && value.weight === variant.size)
    .reduce((sum, value) => sum + value.quantity, 0);
  const quantity = Math.min(item.quantity, 20 - used, variant.stock - used);
  if (quantity < 1) return items;
  const updated = { ...item, variantId: variant.id, weight: variant.size, grind, quantity, unitPrice: variant.salePrice ?? variant.price };
  return sanitizeCart(items.map((value, i) => i === index ? updated : value));
}
