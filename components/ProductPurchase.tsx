"use client";

import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultProductVariant, productPricing, productVariants, STANDARD_GRINDS } from "@/lib/products";
import type { Product, Grind } from "@/types";
import { useCart } from "./CartProvider";

export function ProductPurchase({ product, compact = false }: { product: Product; compact?: boolean }) {
  const variants = useMemo(() => productVariants(product), [product]);
  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const [size, setSize] = useState<string>(() => defaultProductVariant(product)?.size ?? "");
  const coffeeBag = product.product_format === "coffee_bag";
  const [grind, setGrind] = useState<Grind>(coffeeBag ? "Coffee Bag" : "Whole Bean");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart } = useCart();
  const variant = variants.find((item) => item.size === size);
  const pricing = productPricing(product, size, variant);
  const price = pricing.salePrice ?? pricing.price;
  const regularPrice = pricing.price;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function chooseSize(next: string) { setSize(next); setQuantity(1); }
  function addToBag() {
    if (!variant) return;
    const didAdd = addToCart({ product, variantId: variant.id, weight: variant.size, grind, quantity, unitPrice: price });
    if (!didAdd) return;
    setAdded(true); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 2500);
  }
  return <div className={`purchase-panel ${compact ? "purchase-panel-compact" : ""}`}>
    <div className="purchase-price">{price < regularPrice && <del>₩{regularPrice.toLocaleString("ko-KR")}</del>}<span>{price > 0 ? `₩${price.toLocaleString("ko-KR")}` : "가격 준비 중"}</span><small>/ {variant?.size}</small></div>
    <fieldset className="option-group"><legend>{coffeeBag ? "PACK" : "SIZE"} <small>{coffeeBag ? "구성" : "용량"}</small></legend><div className="option-grid option-grid-weight">{sizes.map((value) => {
      const optionVariant = variants.find((item) => item.size === value);
      const optionPricing = productPricing(product, value, optionVariant);
      const optionPrice = optionPricing.salePrice ?? optionPricing.price;
      return <button type="button" key={value} aria-pressed={size === value} disabled={!optionVariant?.available} onClick={() => chooseSize(value)}><span>{value}</span><span>{optionPrice > 0 ? `₩${optionPrice.toLocaleString("ko-KR")}` : "가격 미정"}</span></button>;
    })}</div></fieldset>
    {coffeeBag && <p className="purchase-stock-note">커피백은 별도 분쇄도 선택 없이 간편하게 즐기는 상품입니다.{price>0 && variant ? ` · 잔당 약 ₩${Math.round(price/(variant.size==="5개입"?5:10)).toLocaleString("ko-KR")}` : ""}</p>}
    {!coffeeBag && <fieldset className="option-group"><legend>GRIND <small>분쇄도</small></legend><div className="option-grid option-grid-grind">{STANDARD_GRINDS.map((value) => <button type="button" key={value} aria-pressed={grind === value} onClick={() => setGrind(value)}><span>{value}</span><small>{value === "Whole Bean" ? "원두 그대로" : value === "Filter" ? "핸드드립" : "에스프레소"}</small></button>)}</div></fieldset>}
    <div className="purchase-actions"><div className="quantity-stepper"><button type="button" aria-label="Decrease" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)}><Minus size={14}/></button><span>{quantity}</span><button type="button" aria-label="Increase" disabled={!variant || quantity >= variant.stock} onClick={() => setQuantity((value) => value + 1)}><Plus size={14}/></button></div>
      <button type="button" className={`add-to-bag ${added ? "is-added" : ""}`} disabled={!variant?.available || variant.stock < 1 || price <= 0} onClick={addToBag}><span>{added ? <><Check size={15}/> 담았습니다</> : variant?.available && variant.stock > 0 ? "ADD TO CART" : "SOLD OUT"}</span><strong>₩{(price * quantity).toLocaleString("ko-KR")}</strong></button></div>
    {variant && variant.stock > 0 && variant.stock <= 3 && <p className="purchase-stock-note">현재 선택 옵션은 {variant.stock}개 남았습니다.</p>}
    <div className={`purchase-confirmation ${added ? "is-visible" : ""}`}><span>장바구니에 추가되었습니다.</span><Link href="/cart">VIEW CART →</Link></div>
  </div>;
}
