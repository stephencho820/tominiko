"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { normalizeGrind } from "@/lib/product-contract";
import { productVariants } from "@/lib/products";
import type { Product } from "@/types";

export type ReorderLine = { product_id: string | null; weight: string; grind: string; quantity: number };
export function ReorderButton({ lines }: { lines: ReorderLine[] }) {
  const router = useRouter();
  const { add, cartReady } = useCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function reorder() {
    if (busy || !cartReady) return;
    setBusy(true); setMessage("");
    try {
      const ids = [...new Set(lines.map(line => line.product_id).filter((id): id is string => Boolean(id)))];
      if (!ids.length) throw new Error("재주문 가능한 원두 정보가 없습니다.");
      const response = await fetch("/api/products/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      if (!response.ok) throw new Error("상품 정보를 확인하지 못했습니다.");
      const payload = await response.json() as { products?: Product[] };
      const products = new Map((payload.products ?? []).map(product => [product.id, product]));
      let added = 0, unavailable = 0;
      for (const line of lines) {
        const product = line.product_id ? products.get(line.product_id) : undefined;
        const variant = product ? productVariants(product).find(v => v.size === line.weight && v.available && v.stock > 0) : undefined;
        const grind = normalizeGrind(line.grind);
        if (!product || product.status !== "active" || !variant || !grind) { unavailable++; continue; }
        const quantity = Math.min(Math.max(1, line.quantity), variant.stock, 20);
        if (add({ product, variantId: variant.id, weight: variant.size, grind, quantity, unitPrice: variant.salePrice ?? variant.price })) added++;
        else unavailable++;
      }
      if (!added) throw new Error("현재 재고 또는 장바구니 수량 제한으로 담을 수 없습니다.");
      if (unavailable) { setMessage(`${added}개 상품을 담았습니다. ${unavailable}개 상품은 품절 또는 수량 제한으로 제외되었습니다.`); return; }
      router.push("/cart");
    } catch (error) { setMessage(error instanceof Error ? error.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4"><button type="button" disabled={!cartReady || busy} onClick={() => void reorder()} className="button-secondary rounded px-4 py-3 text-sm" aria-busy={busy}>{busy ? "현재 가격·재고 확인 중…" : "같은 원두 다시 담기 ↗"}</button>{message && <p role="status" className="mt-2 text-sm text-[var(--muted)]">{message} <a className="underline" href="/cart">장바구니 확인 →</a></p>}</div>;
}
