"use client";

import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { productVariants } from "@/lib/products";
import type { Product } from "@/types";
import { useCart } from "./CartProvider";

export function ProductPurchase({ product, compact = false }: { product: Product; compact?: boolean }) {
  const variants = useMemo(() => productVariants(product), [product]);
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const [size, setSize] = useState(sizes[0] ?? "");
  const availableGrinds = variants.filter((variant) => variant.size === size);
  const [variantId, setVariantId] = useState(availableGrinds[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart } = useCart();
  const variant = variants.find((item) => item.id === variantId) ?? availableGrinds[0];
  const price = variant ? variant.salePrice ?? variant.price : product.price_150g;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function chooseSize(next: string) { setSize(next); setVariantId(variants.find((item) => item.size === next)?.id ?? ""); setQuantity(1); }
  function addToBag() {
    if (!variant) return;
    const didAdd = addToCart({ product, variantId: variant.id, weight: variant.size, grind: variant.grindType, quantity, unitPrice: price });
    if (!didAdd) return;
    setAdded(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 2500);
  }
  return <div className={`purchase-panel ${compact ? "purchase-panel-compact" : ""}`}>
    <div className="purchase-price"><span>₩{price.toLocaleString("ko-KR")}</span><small>/ {variant?.size}</small></div>
    <fieldset className="option-group"><legend>SIZE</legend><div className="option-grid option-grid-weight">{sizes.map((value) => <button type="button" key={value} aria-pressed={size === value} onClick={() => chooseSize(value)}>{value}</button>)}</div></fieldset>
    <fieldset className="option-group"><legend>GRIND</legend><div className="option-grid option-grid-grind">{availableGrinds.map((item) => <button type="button" key={item.id} aria-pressed={variant?.id === item.id} onClick={() => setVariantId(item.id)}>{item.grindType}</button>)}</div></fieldset>
    <div className="purchase-actions"><div className="quantity-stepper"><button type="button" aria-label="Decrease" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)}><Minus size={14}/></button><span>{quantity}</span><button type="button" aria-label="Increase" disabled={!variant || quantity >= variant.stock} onClick={() => setQuantity((value) => value + 1)}><Plus size={14}/></button></div>
      <button type="button" className={`add-to-bag ${added ? "is-added" : ""}`} disabled={!variant || variant.stock < 1} onClick={addToBag}><span>{added ? <><Check size={15}/> 담았습니다</> : variant ? "ADD TO CART" : "SOLD OUT"}</span><strong>₩{(price * quantity).toLocaleString("ko-KR")}</strong></button></div>
    <div className={`purchase-confirmation ${added ? "is-visible" : ""}`}><span>장바구니에 추가되었습니다.</span><Link href="/cart">VIEW CART →</Link></div>
  </div>;
}
