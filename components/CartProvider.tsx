"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartItemKey, itemPrice, maxCartQuantity, sanitizeCart } from "@/lib/cart";
import type { CartItem } from "@/types";

const CART_STORAGE_KEY = "casa-cart";

type CartContext = {
  items: CartItem[];
  cartItems: CartItem[];
  add: (item: CartItem) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  updateOptions: (index: number, options: Partial<Pick<CartItem, "weight" | "grind">>) => void;
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
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setItems(sanitizeCart(JSON.parse(stored)));
    } catch {
      // Storage can be unavailable in private browsing, embedded previews, or
      // when the browser blocks site data. Do not touch it again in the error
      // path: even reading `window.localStorage` can itself throw.
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Checkout remains usable when storage is unavailable or full.
    }
  }, [hasHydrated, items]);

  const add = useCallback((item: CartItem) => setItems((current) => {
    const safeItem = sanitizeCart([item])[0];
    if (!safeItem) return current;
    const existing = current.findIndex((currentItem) => cartItemKey(currentItem) === cartItemKey(safeItem));
    if (existing === -1) return [...current, safeItem];
    return current.map((currentItem, index) => index === existing
      ? { ...currentItem, quantity: Math.min(maxCartQuantity(currentItem), currentItem.quantity + safeItem.quantity) }
      : currentItem);
  }), []);
  const removeFromCart = useCallback((itemKey: string) => setItems((current) => current.filter((item) => cartItemKey(item) !== itemKey)), []);
  const updateQuantity = useCallback((itemKey: string, quantity: number) => setItems((current) => current.map((item) => cartItemKey(item) === itemKey
    ? { ...item, quantity: Math.min(maxCartQuantity(item), Math.max(1, Math.trunc(quantity))) }
    : item)), []);
  const remove = useCallback((index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)), []);
  const update = useCallback((index: number, quantity: number) => setItems((current) => current.map((item, itemIndex) => itemIndex === index
    ? { ...item, quantity: Math.min(maxCartQuantity(item), Math.max(1, Math.trunc(quantity))) }
    : item)), []);
  const updateOptions = useCallback((index: number, options: Partial<Pick<CartItem, "weight" | "grind">>) => setItems((current) => current.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    const weight = options.weight ?? item.weight;
    return { ...item, ...options, unitPrice: itemPrice(item.product, weight) };
  })), []);
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
