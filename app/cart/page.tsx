"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";

const money = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

export default function CartPage() {
  const { items, total, remove, update, updateOptions } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="purchase-page cart-page">
      <header className="purchase-heading">
        <div>
          <p className="section-label"><span className="lang-ko">선택한 커피</span><span className="lang-en">Your selection</span></p>
          <h1><span className="lang-ko">장바구니</span><span className="lang-en">Your bag</span></h1>
        </div>
        <p className="purchase-count">{itemCount} <span className="lang-ko">개</span><span className="lang-en">items</span></p>
      </header>

      {!items.length ? (
        <section className="empty-bag" aria-live="polite">
          <p><span className="lang-ko">아직 담긴 커피가 없습니다.</span><span className="lang-en">Your bag is ready for something good.</span></p>
          <Link href="/shop" className="button-primary purchase-button"><span className="lang-ko">커피 둘러보기</span><span className="lang-en">Browse coffee</span><span>→</span></Link>
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-list" aria-label="Cart items">
            {items.map((item, index) => (
              <article className="cart-item" key={`${item.product.id}-${item.weight}-${item.grind}-${index}`}>
                <div className="cart-image grain">
                  {item.product.image_url ? <img src={item.product.image_url} alt={item.product.name} /> : <span>{item.product.origin}</span>}
                </div>
                <div className="cart-item-main">
                  <div className="cart-item-title">
                    <div><p className="section-label">Tominiko Coffee</p><h2>{item.product.name}</h2></div>
                    <button type="button" className="cart-remove" onClick={() => remove(index)} aria-label={`${item.product.name} remove`}><X size={16} /><span><span className="lang-ko">삭제</span><span className="lang-en">Remove</span></span></button>
                  </div>
                  <div className="cart-options">
                    <label><span><span className="lang-ko">중량</span><span className="lang-en">Weight</span></span><select value={item.weight} onChange={(event) => updateOptions(index, { weight: event.target.value as "150g" | "400g" })}><option value="150g">150g</option><option value="400g">400g</option></select></label>
                    <label><span><span className="lang-ko">분쇄</span><span className="lang-en">Grind</span></span><select value={item.grind} onChange={(event) => updateOptions(index, { grind: event.target.value as typeof item.grind })}><option value="Whole Bean">Whole Bean</option><option value="Filter">Filter</option><option value="Espresso">Espresso</option></select></label>
                  </div>
                  <div className="cart-item-footer">
                    <div className="quantity-control" aria-label="Quantity selector">
                      <button type="button" onClick={() => update(index, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease quantity"><Minus size={15} /></button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" onClick={() => update(index, item.quantity + 1)} disabled={item.quantity >= 20 || item.quantity >= item.product.stock_quantity} aria-label="Increase quantity"><Plus size={15} /></button>
                    </div>
                    <strong>{money(item.unitPrice * item.quantity)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className="cart-totals">
            <p className="section-label"><span className="lang-ko">주문 금액</span><span className="lang-en">Order total</span></p>
            <div className="total-line"><span><span className="lang-ko">상품 금액</span><span className="lang-en">Subtotal</span></span><span>{money(total)}</span></div>
            <p className="shipping-note"><span className="lang-ko">수령 방법은 다음 단계에서 선택합니다.</span><span className="lang-en">Choose delivery or pickup in the next step.</span></p>
            <div className="total-line total-emphasis"><span>Total</span><strong>{money(total)}</strong></div>
            <Link href="/checkout" className="button-primary purchase-button"><span className="lang-ko">주문 정보 입력</span><span className="lang-en">Continue to checkout</span><span>→</span></Link>
            <Link href="/shop" className="continue-link"><span className="lang-ko">쇼핑 계속하기</span><span className="lang-en">Continue shopping</span></Link>
          </aside>
        </div>
      )}
    </main>
  );
}
