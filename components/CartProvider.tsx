"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addCartItem, cartItemKey, maxCartQuantity, refreshCartProducts, sanitizeCart, updateCartOptions } from "@/lib/cart";
import { usePathname } from "next/navigation";
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
  cartReady: boolean;
  refreshError: string;
  refreshCart: () => Promise<CartItem[]>;
};

const Context = createContext<CartContext | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();
  const refreshRequest = useRef(0);
  const setCartItems = useCallback((update: CartItem[] | ((current: CartItem[]) => CartItem[])) => {
    const next = typeof update === "function" ? update(itemsRef.current) : update;
    itemsRef.current = next;
    setItems(next);
  }, []);

  const refreshCart = useCallback(async () => {
    const snapshot = itemsRef.current;
    const request = ++refreshRequest.current;
    setRefreshing(true);
    try {
      let refreshed = snapshot;
      if (snapshot.length) {
        const response = await fetch("/api/products/refresh", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [...new Set(snapshot.map((item) => item.product.id))] }),
        });
        if (!response.ok) throw new Error("상품 가격과 재고를 확인하지 못했습니다. 다시 시도해 주세요.");
        const { products } = await response.json() as { products: CartItem["product"][] };
        refreshed = refreshCartProducts(snapshot, products);
      }
      // A late refresh must never restore a removed line or a paid/cleared cart.
      if (itemsRef.current !== snapshot || request !== refreshRequest.current) throw new Error("장바구니가 변경되었습니다. 다시 확인해 주세요.");
      setCartItems(refreshed);
      setRefreshError("");
      return refreshed;
    } catch (error) {
      if (request === refreshRequest.current) setRefreshError(error instanceof Error ? error.message : "상품 정보를 확인하지 못했습니다.");
      throw error;
    } finally {
      if (request === refreshRequest.current) setRefreshing(false);
    }
  }, [setCartItems]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setCartItems(sanitizeCart(JSON.parse(stored)));
    } catch { /* Site storage may be unavailable. */ }
    setHasHydrated(true);
  }, [setCartItems]);

  useEffect(() => {
    if (!hasHydrated) return;
    const refresh = () => { void refreshCart().catch(() => undefined); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { ++refreshRequest.current; window.removeEventListener("focus", refresh); };
  }, [hasHydrated, pathname, refreshCart]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Checkout remains usable when storage is unavailable or full.
    }
  }, [hasHydrated, items]);

  const add = useCallback((item: CartItem) => {
    const next = addCartItem(itemsRef.current, item);
    if (next === itemsRef.current) return false;
    setCartItems(next);
    return true;
  }, [setCartItems]);
  const removeFromCart = useCallback((itemKey: string) => setCartItems((current) => current.filter((item) => cartItemKey(item) !== itemKey)), [setCartItems]);
  const updateQuantity = useCallback((itemKey: string, quantity: number) => setCartItems((current) => sanitizeCart(current.map((item) => cartItemKey(item) === itemKey
    ? { ...item, quantity: Math.min(maxCartQuantity(item, current), Math.max(1, Math.trunc(quantity))) }
    : item))), [setCartItems]);
  const remove = useCallback((index: number) => setCartItems((current) => current.filter((_, itemIndex) => itemIndex !== index)), [setCartItems]);
  const update = useCallback((index: number, quantity: number) => setCartItems((current) => sanitizeCart(current.map((item, itemIndex) => itemIndex === index
    ? { ...item, quantity: Math.min(maxCartQuantity(item, current), Math.max(1, Math.trunc(quantity))) }
    : item))), [setCartItems]);
  const updateOptions = useCallback((index: number, options: Partial<Pick<CartItem, "variantId" | "weight" | "grind">>) => {
    setCartItems((current) => updateCartOptions(current, index, options));
  }, [setCartItems]);
  const clear = useCallback(() => setCartItems([]), [setCartItems]);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const value = useMemo<CartContext>(() => ({
    items, cartItems: items,
    add, addToCart: add, remove, removeFromCart, update, updateQuantity, updateOptions, clear, clearCart: clear,
    cartCount, cartSubtotal, total: cartSubtotal,
    cartReady: hasHydrated && !refreshing && !refreshError, refreshError, refreshCart,
  }), [hasHydrated, refreshing, refreshError, refreshCart, add, cartCount, cartSubtotal, clear, items, remove, removeFromCart, update, updateOptions, updateQuantity]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error("useCart must be inside CartProvider");
  return context;
}
