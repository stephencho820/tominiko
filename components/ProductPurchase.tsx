"use client";

import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import { useCart } from "./CartProvider";

const weights = ["150g", "400g"] as const;
const grinds = [
  { value: "Whole Bean", ko: "홀빈" },
  { value: "Filter", ko: "필터용" },
  { value: "Espresso", ko: "에스프레소용" },
] as const;

export function ProductPurchase({ product, compact = false }: { product: Product; compact?: boolean }) {
  const [weight, setWeight] = useState<(typeof weights)[number]>("150g");
  const [grind, setGrind] = useState<(typeof grinds)[number]["value"]>("Whole Bean");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { add } = useCart();
  const soldOut = product.stock_quantity < 1;
  const unitPrice = weight === "150g" ? product.price_150g : product.price_400g;
  const originalPrice = weight === "400g" ? product.price_400g_original : null;
  const totalPrice = unitPrice * quantity;

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  function addToBag() {
    add({ product, weight, grind, quantity, unitPrice });
    setAdded(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setAdded(false), 3200);
  }

  return (
    <div className={`purchase-panel ${compact ? "purchase-panel-compact" : ""}`}>
      <div className="purchase-price" aria-live="polite">
        <span>₩{unitPrice.toLocaleString()}</span>
        {originalPrice && <del>₩{originalPrice.toLocaleString()}</del>}
        <small>/ {weight}</small>
      </div>

      <fieldset className="option-group">
        <legend><span className="lang-ko">중량</span><span className="lang-en">Weight</span></legend>
        <div className="option-grid option-grid-weight">
          {weights.map((option) => (
            <button key={option} type="button" aria-pressed={weight === option} onClick={() => setWeight(option)}>
              <span>{option}</span>
              <span className="weight-option-price">{option === "400g" && product.price_400g_original && <del>₩{product.price_400g_original.toLocaleString()}</del>}<span>₩{(option === "150g" ? product.price_150g : product.price_400g).toLocaleString()}</span></span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="option-group">
        <legend><span className="lang-ko">분쇄도</span><span className="lang-en">Grind</span></legend>
        <div className="option-grid option-grid-grind">
          {grinds.map((option) => (
            <button key={option.value} type="button" aria-pressed={grind === option.value} onClick={() => setGrind(option.value)}><span className="lang-ko">{option.ko}</span><span className="lang-en">{option.value}</span></button>
          ))}
        </div>
      </fieldset>

      <div className="purchase-actions">
        <div className="quantity-stepper" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={14} /></button>
          <span aria-live="polite">{quantity}</span>
          <button type="button" aria-label="Increase quantity" disabled={quantity >= product.stock_quantity} onClick={() => setQuantity((value) => Math.min(product.stock_quantity, value + 1))}><Plus size={14} /></button>
        </div>
        <button type="button" disabled={soldOut} onClick={addToBag} className={`add-to-bag ${added ? "is-added" : ""}`}>
          <span>
            {soldOut ? "SOLD OUT" : added ? <><Check size={15} /><span className="lang-ko">담았습니다</span><span className="lang-en">ADDED</span></> : <><span className="lang-ko">장바구니에 담기</span><span className="lang-en">ADD TO BAG</span></>}
          </span>
          {!soldOut && <strong>₩{totalPrice.toLocaleString()}</strong>}
        </button>
      </div>

      <div className={`purchase-confirmation ${added ? "is-visible" : ""}`} aria-live="polite" aria-atomic="true">
        <span><span className="lang-ko">선택한 커피가 장바구니에 담겼습니다.</span><span className="lang-en">Your coffee is in the bag.</span></span>
        <Link href="/cart"><span className="lang-ko">장바구니 보기</span><span className="lang-en">View bag</span> →</Link>
      </div>

      <p className="purchase-dispatch">
        <span className="lang-ko">신선하게 로스팅해 영업일 기준 2일 내 발송합니다.</span>
        <span className="lang-en">Freshly roasted and packed for dispatch within 2 business days.</span>
      </p>
    </div>
  );
}
