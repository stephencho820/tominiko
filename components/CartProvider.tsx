"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartItemKey, maxCartQuantity, sanitizeCart } from "@/lib/cart";
import { normalizeProductSize, productVariants } from "@/lib/products";
import type { CartItem } from "@/types";

const CART_STORAGE_KEY = "casa-cart";

type CartContext = {
  items: CartItem[];
  cartItems: CartItem[];
  add: (item: CartItem) => boolean;
  addToCart: (item: CartItem) => boolean;
  removeFromCart: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  updateOptions: (index: number, options: Partial<Pick<CartItem, "variantId" | "weight" | "grind">>) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  // Backwards-compatible names used by the checkout flow.
  remove: (index: number) => void;
  update: (index: number, quantity: number) => void;
  clear: () => void;
  total: number;
};

const Context = createContext<CartContext | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      let storedItems: CartItem[] = [];
      try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
        if (stored) storedItems = sanitizeCart(JSON.parse(stored));
        if (storedItems.length) {
          const response = await fetch("/api/products/refresh", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [...new Set(storedItems.map((item) => item.product.id))] }),
          });
          if (response.ok) {
            const { products } = await response.json() as { products: CartItem["product"][] };
            const currentProducts = new Map(products.map((product) => [product.id, product]));
            storedItems = storedItems.flatMap((item) => {
              const product = currentProducts.get(item.product.id);
              if (!product) return [];
              const variant = productVariants(product).find((value) => value.id === item.variantId)
                ?? productVariants(product).find((value) => normalizeProductSize(value.size) === normalizeProductSize(item.weight) && value.grindType === item.grind);
              if (!variant?.available || variant.stock < 1) return [];
              return [{ ...item, product, variantId: variant.id, weight: variant.size, grind: variant.grindType,
                unitPrice: variant.salePrice ?? variant.price, quantity: Math.min(item.quantity, variant.stock) }];
            });
          }
        }
        if (!cancelled) setItems(storedItems);
      } catch {
      // Storage can be unavailable in private browsing, embedded previews, or
      // when the browser blocks site data. Do not touch it again in the error
      // path: even reading `window.localStorage` can itself throw.
      } finally {
        if (!cancelled) setHasHydrated(true);
      }
    }
    void hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Checkout remains usable when storage is unavailable or full.
    }
  }, [hasHydrated, items]);

  const add = useCallback((item: CartItem) => {
    const safeItem = sanitizeCart([item])[0];
    if (!safeItem) return false;
    setItems((current) => {
      const existing = current.findIndex((currentItem) => cartItemKey(currentItem) === cartItemKey(safeItem));
      if (existing === -1) return [...current, safeItem];
      return current.map((currentItem, index) => index === existing
        ? { ...currentItem, quantity: Math.min(maxCartQuantity(currentItem), currentItem.quantity + safeItem.quantity) }
        : currentItem);
    });
    return true;
  }, []);
  const removeFromCart = useCallback((itemKey: string) => setItems((current) => current.filter((item) => cartItemKey(item) !== itemKey)), []);
  const updateQuantity = useCallback((itemKey: string, quantity: number) => setItems((current) => current.map((item) => cartItemKey(item) === itemKey
    ? { ...item, quantity: Math.min(maxCartQuantity(item), Math.max(1, Math.trunc(quantity))) }
    : item)), []);
  const remove = useCallback((index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)), []);
  const update = useCallback((index: number, quantity: number) => setItems((current) => current.map((item, itemIndex) => itemIndex === index
    ? { ...item, quantity: Math.min(maxCartQuantity(item), Math.max(1, Math.trunc(quantity))) }
    : item)), []);
  const updateOptions = useCallback((index: number, options: Partial<Pick<CartItem, "variantId" | "weight" | "grind">>) => setItems((current) => {
    const item = current[index];
    if (!item) return current;
    const variant = productVariants(item.product).find((value) => value.id === options.variantId)
      ?? productVariants(item.product).find((value) => normalizeProductSize(value.size) === normalizeProductSize(options.weight ?? item.weight) && value.grindType === (options.grind ?? item.grind));
    if (!variant?.available || variant.stock < 1) return current;
    const updated = { ...item, variantId: variant.id, weight: variant.size, grind: variant.grindType, unitPrice: variant.salePrice ?? variant.price, quantity: Math.min(item.quantity, variant.stock) };
    const duplicate = current.findIndex((value, itemIndex) => itemIndex !== index && cartItemKey(value) === cartItemKey(updated));
    if (duplicate < 0) return current.map((value, itemIndex) => itemIndex === index ? updated : value);
    return current.flatMap((value, itemIndex) => itemIndex === index ? [] : [itemIndex === duplicate
      ? { ...value, quantity: Math.min(maxCartQuantity(value), value.quantity + updated.quantity) }
      : value]);
  }), []);
  const clear = useCallback(() => setItems([]), []);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const value = useMemo<CartContext>(() => ({
    items, cartItems: items,
    add, addToCart: add, remove, removeFromCart, update, updateQuantity, updateOptions, clear, clearCart: clear,
    cartCount, cartSubtotal, total: cartSubtotal,
  }), [add, cartCount, cartSubtotal, clear, items, remove, removeFromCart, update, updateOptions, updateQuantity]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error("useCart must be inside CartProvider");
  return context;
}
