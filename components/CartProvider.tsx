"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { itemPrice, maxCartQuantity, sanitizeCart } from "@/lib/cart";
import type { CartItem } from "@/types";

const CART_STORAGE_KEY = "casa-cart";

type CartContext = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (index: number) => void;
  update: (index: number, quantity: number) => void;
  updateOptions: (index: number, options: Partial<Pick<CartItem, "weight" | "grind">>) => void;
  clear: () => void;
  total: number;
};

const Context = createContext<CartContext | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setItems(sanitizeCart(JSON.parse(stored)));
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Checkout remains usable when storage is unavailable or full.
    }
  }, [hasHydrated, items]);

  const add = useCallback((item: CartItem) => setItems((current) => {
    const safeItem = sanitizeCart([item])[0];
    if (!safeItem) return current;
    const existing = current.findIndex((currentItem) => currentItem.product.id === safeItem.product.id && currentItem.weight === safeItem.weight && currentItem.grind === safeItem.grind);
    if (existing === -1) return [...current, safeItem];
    return current.map((currentItem, index) => index === existing
      ? { ...currentItem, quantity: Math.min(maxCartQuantity(currentItem), currentItem.quantity + safeItem.quantity) }
      : currentItem);
  }), []);
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

  const value = useMemo<CartContext>(() => ({
    items,
    add, remove, update, updateOptions, clear,
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  }), [add, clear, items, remove, update, updateOptions]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error("useCart must be inside CartProvider");
  return context;
}
