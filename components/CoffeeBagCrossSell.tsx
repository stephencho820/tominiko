"use client";

import Link from "next/link";
import { useState } from "react";
import { productImage, productVariants } from "@/lib/products";
import type { Product } from "@/types";
import { useCart } from "./CartProvider";

export function CoffeeBagCrossSell({ product }: { product: Product }) {
  const variants = productVariants(product);
  const available = variants.filter((variant) => variant.available && variant.stock > 0);
  const [selectedSize, setSelectedSize] = useState(() => available.find((variant) => variant.size === "5개입")?.size ?? available[0]?.size ?? "");
  const [feedback, setFeedback] = useState("");
  const { addToCart } = useCart();
  if (!available.length) return null;

  const selected = available.find((variant) => variant.size === selectedSize) ?? available[0];
  const price = selected.salePrice ?? selected.price;
  function addRecommendation() {
    const added = addToCart({
      product, variantId: selected.id, weight: selected.size, grind: "Filter",
      quantity: 1, unitPrice: price,
    });
    setFeedback(added ? `${selected.size} 커피백을 장바구니에 담았습니다.` : "선택한 구성의 재고를 확인해 주세요.");
  }

  return (
    <aside className="pdp-cross-sell" aria-label="커피백 추천 구성">
      <div className="pdp-cross-sell-heading">
        <span>추천 구성 · PAIR IT WITH COFFEE</span>
        <strong>원두와 함께 커피백도 담아보세요.</strong>
        <p>로스터가 선택한 커피를 한 팩에 10g씩 담았습니다. 원두와 함께, 간편한 한 잔도 준비해 보세요.</p>
      </div>
      <div className="pdp-cross-sell-product">
        <Link href={`/shop/${product.slug}`} aria-label={`${product.name} 상세 보기`}>
          <img src={productImage(product)} alt={product.korean_name || product.name} />
        </Link>
        <div className="pdp-cross-sell-content">
          <Link href={`/shop/${product.slug}`} className="pdp-cross-sell-name">{product.korean_name || product.name}</Link>
          <div className="pdp-cross-sell-options" role="group" aria-label="커피백 구성 선택">
            {available.map((variant) => <button
              type="button" key={variant.id} aria-pressed={selected.id === variant.id}
              onClick={() => { setSelectedSize(variant.size); setFeedback(""); }}
            >{variant.size}</button>)}
          </div>
          <button type="button" className="pdp-cross-sell-add" onClick={addRecommendation}>
            <span>함께 담기 +</span><strong>₩{price.toLocaleString("ko-KR")}</strong>
          </button>
        </div>
      </div>
      {feedback && <p className="pdp-cross-sell-feedback" role="status">{feedback} <Link href="/cart">장바구니 보기 →</Link></p>}
    </aside>
  );
}
