"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { CartItem } from "@/types";
type CartContext = { items: CartItem[]; add: (item: CartItem) => void; remove: (index: number) => void; update: (index: number, quantity: number) => void; total: number };
const Context = createContext<CartContext | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { const stored = localStorage.getItem("casa-cart"); if (stored) setItems(JSON.parse(stored)); }, []);
  useEffect(() => { localStorage.setItem("casa-cart", JSON.stringify(items)); }, [items]);
  return <Context.Provider value={{ items, add: (item) => setItems((current) => { const existing = current.findIndex((currentItem) => currentItem.product.id === item.product.id && currentItem.weight === item.weight && currentItem.grind === item.grind); if (existing === -1) return [...current, item]; return current.map((currentItem, index) => index === existing ? { ...currentItem, quantity: currentItem.quantity + item.quantity } : currentItem); }), remove: (index) => setItems((current) => current.filter((_, i) => i !== index)), update: (index, quantity) => setItems((current) => current.map((item, i) => i === index ? { ...item, quantity } : item)), total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) }}>{children}</Context.Provider>;
}
export function useCart() { const context = useContext(Context); if (!context) throw new Error("useCart must be inside CartProvider"); return context; }