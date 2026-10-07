"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { productImage, productVariants, STANDARD_GRINDS } from "@/lib/products";
import { cartItemKey, cartItemRegularPrice, maxCartQuantity } from "@/lib/cart";
import { calculateCheckoutTotal, DEFAULT_DELIVERY_SETTINGS, freeShippingProgress, type DeliverySettings } from "@/lib/shipping";
import { useEffect, useState } from "react";

const money = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

export default function CartPage() {
  const { cartItems: items, cartSubtotal: total, cartCount: itemCount, removeFromCart, updateQuantity, updateOptions, cartReady, refreshError, refreshCart } = useCart();
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  useEffect(() => { fetch("/api/checkout").then((response) => { if (!response.ok) throw new Error("배송 설정을 확인하지 못했습니다."); return response.json(); }).then((data) => { setDeliverySettings(data.settings); setSettingsReady(true); }).catch((error) => setSettingsError(error.message)); }, []);
  const shippingProgress = freeShippingProgress(total, deliverySettings);
  const shippingEstimate = calculateCheckoutTotal(total, 0, "shipping", deliverySettings);
  const grindLabel = (value: string) => value === "Whole Bean" ? "Whole Bean · 원두 그대로" : value === "Filter" ? "Filter · 핸드드립" : "Espresso · 에스프레소";

  return (
    <main className="purchase-page cart-page">
      <header className="purchase-heading">
        <div>
          <p className="section-label"><span className="lang-ko">선택한 원두</span><span className="lang-en">Your selection</span></p>
        </div>
        <p className="purchase-count">{itemCount} <span className="lang-ko">개</span><span className="lang-en">items</span></p>
      </header>

      {(refreshError || settingsError) && <p role="alert" className="submit-error">{refreshError || settingsError}{refreshError && <button type="button" onClick={() => { void refreshCart().catch(() => undefined); }}>다시 확인</button>}</p>}
      {!items.length ? (
        <section className="empty-bag" aria-live="polite">
          <p><span className="lang-ko">아직 담긴 커피가 없습니다.</span><span className="lang-en">Your bag is ready for something good.</span></p>
          <Link href="/shop" className="button-primary purchase-button"><span>Back to Shop</span><span>→</span></Link>
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-list" aria-label="Cart items">
            {items.map((item, index) => (
              <article className="cart-item" key={cartItemKey(item)}>
                <div className="cart-image grain">
                  <img src={productImage(item.product)} alt={item.product.name} />
                </div>
                <div className="cart-item-main">
                  <div className="cart-item-title">
                    <div><p className="section-label">Tominiko Coffee</p><h2>{item.product.name}</h2></div>
                    <button type="button" className="cart-remove" onClick={() => removeFromCart(cartItemKey(item))} aria-label={`${item.product.name} remove`}><X size={16} /><span><span className="lang-ko">삭제</span><span className="lang-en">Remove</span></span></button>
                  </div>
                  <div className="cart-options">
                    <label><span><span className="lang-ko">옵션</span><span className="lang-en">Variant</span></span><select value={item.variantId} onChange={(event) => updateOptions(index, { variantId: event.target.value })}>{productVariants(item.product).map((variant) => <option disabled={!variant.available || variant.stock < 1} key={variant.id} value={variant.id}>{variant.size}{variant.stock < 1 ? " · Sold out" : ""}</option>)}</select></label>
                    <label>Grind<select value={item.grind} onChange={(event) => updateOptions(index, { grind: event.target.value as typeof item.grind })}>{STANDARD_GRINDS.map((value) => <option key={value} value={value}>{grindLabel(value)}</option>)}</select></label>
                  </div>
                  <div className="cart-item-footer">
                    <div className="quantity-control" aria-label="Quantity selector">
                      <button type="button" onClick={() => updateQuantity(cartItemKey(item), item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease quantity"><Minus size={15} /></button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(cartItemKey(item), item.quantity + 1)} disabled={item.quantity >= maxCartQuantity(item, items)} aria-label="Increase quantity"><Plus size={15} /></button>
                    </div>
                    <strong className="cart-price-pair">{item.unitPrice < cartItemRegularPrice(item) && <del>{money(cartItemRegularPrice(item) * item.quantity)}</del>}<span>{money(item.unitPrice * item.quantity)}</span></strong>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className="cart-totals">
            <p className="section-label"><span className="lang-ko">주문 금액</span><span className="lang-en">Order total</span></p>
            <div className="total-line"><span><span className="lang-ko">상품 금액</span><span className="lang-en">Subtotal</span></span><span>{money(total)}</span></div>
            <div className="total-line"><span>예상 배송비</span><span>{shippingEstimate.shippingFee ? money(shippingEstimate.shippingFee) : "무료"}</span></div>
            <div className="shipping-progress cart-progress"><div><span>{shippingProgress.qualified ? "✓ 무료배송 혜택을 받으셨어요." : `${money(shippingProgress.remaining)} 더 담으면 무료배송`}</span><small>{Math.round(shippingProgress.percent)}%</small></div><i><span style={{ width: `${shippingProgress.percent}%` }} /></i></div>
            <div className="total-line total-emphasis"><span>택배 기준 예상 결제금액</span><strong>{money(shippingEstimate.finalAmount)}</strong></div>
            <p className="cart-total-note">체크아웃에서 매장 픽업 또는 가능한 경우 로컬배송을 선택하면 배송비가 다시 계산됩니다.</p>
            {cartReady && settingsReady ? <Link href="/checkout" className="button-primary purchase-button"><span className="lang-ko">주문 정보 입력</span><span className="lang-en">Continue to checkout</span><span>→</span></Link> : <button disabled className="button-primary purchase-button">상품 및 배송 정보 확인 필요</button>}
            <Link href="/shop" className="continue-link"><span className="lang-ko">쇼핑 계속하기</span><span className="lang-en">Continue shopping</span></Link>
          </aside>
        </div>
      )}
    </main>
  );
}
