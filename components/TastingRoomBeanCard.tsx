"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { defaultProductVariant, productImage, productIsSoldOut, productPrice } from "@/lib/products";
import type { Product } from "@/types";

const money = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

export function TastingRoomBeanCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const variant = defaultProductVariant(product, "150g");
  const soldOut = productIsSoldOut(product) || !variant?.available;
  function add() {
    if (!variant || soldOut) return;
    const ok = addToCart({ product, variantId: variant.id, weight: variant.size, grind: "Whole Bean", quantity: 1, unitPrice: variant.salePrice ?? variant.price });
    if (ok) { setAdded(true); window.setTimeout(() => setAdded(false), 1400); }
  }
  return <article className="tasting-bean-card">
    <Link href={`/shop/${product.slug}`} className="tasting-bean-image"><img src={productImage(product)} alt={product.name} /></Link>
    <div><p className="section-label">{product.origin || "TOMINIKO COFFEE"}</p><h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3><p>{product.tasting_notes || product.short_description}</p><div className="tasting-bean-actions"><strong>{money(productPrice(product))}<small>부터</small></strong><button type="button" disabled={soldOut} onClick={add}>{soldOut ? "SOLD OUT" : added ? "ADDED ✓" : "ADD 150g"}</button></div></div>
  </article>;
}
