"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { productImage, productVariants, STANDARD_GRINDS } from "@/lib/products";
import { cartItemKey, cartItemRegularPrice, maxCartQuantity } from "@/lib/cart";
import { DEFAULT_DELIVERY_SETTINGS, freeShippingProgress, type DeliverySettings } from "@/lib/shipping";
import { useEffect, useState } from "react";

const money = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

export default function CartPage() {
  const { cartItems: items, cartSubtotal: total, cartCount: itemCount, removeFromCart, updateQuantity, updateOptions } = useCart();
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  useEffect(() => { fetch("/api/checkout").then((response) => response.json()).then((data) => setDeliverySettings(data.settings)).catch(() => undefined); }, []);
  const shippingProgress = freeShippingProgress(total, deliverySettings);

  return (
    <main className="purchase-page cart-page">
      <header className="purchase-heading">
        <div>
          <p className="section-label"><span className="lang-ko">선택한 원두</span><span className="lang-en">Your selection</span></p>
        </div>
        <p className="purchase-count">{itemCount} <span className="lang-ko">개</span><span className="lang-en">items</span></p>
      </header>

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
                    <label>Grind<select value={item.grind} onChange={(event) => updateOptions(index, { grind: event.target.value as typeof item.grind })}>{STANDARD_GRINDS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
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
            <div className="shipping-progress cart-progress"><div><span>{shippingProgress.qualified ? "✓ 무료배송 혜택을 받으셨어요." : `${money(shippingProgress.remaining)} 더 담으면 무료배송`}</span><small>{Math.round(shippingProgress.percent)}%</small></div><i><span style={{ width: `${shippingProgress.percent}%` }} /></i></div>
            <div className="total-line total-emphasis"><span>Total</span><strong>{money(total)}</strong></div>
            <Link href="/checkout" className="button-primary purchase-button"><span className="lang-ko">주문 정보 입력</span><span className="lang-en">Continue to checkout</span><span>→</span></Link>
            <Link href="/shop" className="continue-link"><span className="lang-ko">쇼핑 계속하기</span><span className="lang-en">Continue shopping</span></Link>
          </aside>
        </div>
      )}
    </main>
  );
}
