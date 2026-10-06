"use client";

import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { productPricing, productVariants, STANDARD_GRINDS } from "@/lib/products";
import type { Grind, Product, Weight } from "@/types";
import { useCart } from "./CartProvider";

export function ProductPurchase({ product, compact = false }: { product: Product; compact?: boolean }) {
  const variants = useMemo(() => productVariants(product), [product]);
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const [size, setSize] = useState(sizes[0] ?? "");
  const variant = variants.find((item) => item.size === size);
  const [grind, setGrind] = useState<Grind>("Whole Bean");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart } = useCart();
  const pricing = productPricing(product, size, variant);
  const price = pricing.salePrice ?? pricing.price;
  const regularPrice = pricing.price;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function chooseSize(next: Weight) { setSize(next); setQuantity(1); }
  function addToBag() {
    if (!variant) return;
    const didAdd = addToCart({ product, variantId: variant.id, weight: variant.size, grind, quantity, unitPrice: price });
    if (!didAdd) return;
    setAdded(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 2500);
  }
  return <div className={`purchase-panel ${compact ? "purchase-panel-compact" : ""}`}>
    <div className="purchase-price">{price < regularPrice && <del>₩{regularPrice.toLocaleString("ko-KR")}</del>}<span>₩{price.toLocaleString("ko-KR")}</span><small>/ {variant?.size}</small></div>
    <fieldset className="option-group"><legend>SIZE</legend><div className="option-grid option-grid-weight">{sizes.map((value) => <button type="button" key={value} aria-pressed={size === value} onClick={() => chooseSize(value)}>{value}</button>)}</div></fieldset>
    <fieldset className="option-group"><legend>GRIND</legend><div className="option-grid option-grid-grind">{STANDARD_GRINDS.map((value) => <button type="button" key={value} aria-pressed={grind === value} onClick={() => setGrind(value)}>{value}</button>)}</div></fieldset>
    <div className="purchase-actions"><div className="quantity-stepper"><button type="button" aria-label="Decrease" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)}><Minus size={14}/></button><span>{quantity}</span><button type="button" aria-label="Increase" disabled={!variant || quantity >= variant.stock} onClick={() => setQuantity((value) => value + 1)}><Plus size={14}/></button></div>
      <button type="button" className={`add-to-bag ${added ? "is-added" : ""}`} disabled={!variant || variant.stock < 1} onClick={addToBag}><span>{added ? <><Check size={15}/> 담았습니다</> : variant ? "ADD TO CART" : "SOLD OUT"}</span><strong>₩{(price * quantity).toLocaleString("ko-KR")}</strong></button></div>
    <div className={`purchase-confirmation ${added ? "is-visible" : ""}`}><span>장바구니에 추가되었습니다.</span><Link href="/cart">VIEW CART →</Link></div>
  </div>;
}
