"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
      if (stored) setItems(JSON.parse(stored) as CartItem[]);
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [hasHydrated, items]);

  const value: CartContext = {
    items,
    add: (item) => setItems((current) => {
      const existing = current.findIndex((currentItem) => currentItem.product.id === item.product.id && currentItem.weight === item.weight && currentItem.grind === item.grind);
      if (existing === -1) return [...current, item];
      return current.map((currentItem, index) => index === existing ? { ...currentItem, quantity: currentItem.quantity + item.quantity } : currentItem);
    }),
    remove: (index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)),
    update: (index, quantity) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.min(20, Math.max(1, quantity)) } : item)),
    updateOptions: (index, options) => setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const weight = options.weight ?? item.weight;
      return {
        ...item,
        ...options,
        unitPrice: weight === "150g" ? item.product.price_150g : item.product.price_300g,
      };
    })),
    clear: () => setItems([]),
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error("useCart must be inside CartProvider");
  return context;
}
