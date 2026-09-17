"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Check } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import type { CartItem } from "@/types";

type Fulfillment = "delivery" | "pickup";
type FormFields = { customerName: string; phone: string; email: string; postalCode: string; address: string; addressDetail: string; deliveryMessage: string };
type FieldErrors = Partial<Record<keyof FormFields | "submit", string>>;
type CompletedOrder = { orderNumber: string; items: CartItem[]; total: number; fulfillment: Fulfillment };

const initialForm: FormFields = { customerName: "", phone: "", email: "", postalCode: "", address: "", addressDetail: "", deliveryMessage: "" };
const money = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

function OrderSummary({ items, total, fulfillment, compact = false }: { items: CartItem[]; total: number; fulfillment: Fulfillment; compact?: boolean }) {
  return (
    <div className={compact ? "completion-summary" : "order-summary-inner"}>
      {!compact && <p className="section-label"><span className="lang-ko">주문 내역</span><span className="lang-en">Order summary</span></p>}
      <div className="summary-items">
        {items.map((item, index) => <div className="summary-item" key={`${item.product.id}-${index}`}><div><strong>{item.product.name}</strong><span>{item.weight} · {item.grind} · <span className="lang-ko">수량</span><span className="lang-en">Qty</span> {item.quantity}</span></div><span>{money(item.unitPrice * item.quantity)}</span></div>)}
      </div>
      <dl className="summary-costs">
        <div><dt>Subtotal</dt><dd>{money(total)}</dd></div>
        <div><dt>Shipping</dt><dd>{fulfillment === "pickup" ? <><span className="lang-ko">없음</span><span className="lang-en">None</span></> : <><span className="lang-ko">미적용</span><span className="lang-en">Not applied</span></>}</dd></div>
        <div className="summary-total"><dt>Total</dt><dd>{money(total)}</dd></div>
      </dl>
    </div>
  );
}

export default function Checkout() {
  const { items, total, clear } = useCart();
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);

  const change = (field: keyof FormFields, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (!form.customerName.trim()) next.customerName = "이름을 입력해 주세요. / Enter your name.";
    if (!form.phone.trim()) next.phone = "전화번호를 입력해 주세요. / Enter your phone number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "올바른 이메일을 입력해 주세요. / Enter a valid email.";
    if (fulfillment === "delivery") {
      if (!form.postalCode.trim()) next.postalCode = "우편번호를 입력해 주세요. / Enter a postal code.";
      if (!form.address.trim()) next.address = "주소를 입력해 주세요. / Enter an address.";
    }
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    setErrors({});
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, fulfillmentType: fulfillment, items }) });
      const data = await response.json() as { orderNumber?: string; error?: string };
      if (!response.ok || !data.orderNumber) throw new Error(data.error || "Could not create order");
      setCompleted({ orderNumber: data.orderNumber, items: [...items], total, fulfillment });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ submit: "주문을 접수하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요. / We couldn't submit your order. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) return (
    <main className="purchase-page order-complete">
      <div className="complete-mark" aria-hidden="true"><Check size={28} strokeWidth={1.5} /></div>
      <p className="section-label"><span className="lang-ko">주문 접수 완료</span><span className="lang-en">Order received</span></p>
      <h1><span className="lang-ko">주문이 접수되었습니다.</span><span className="lang-en">Your order is in.</span></h1>
      <p className="complete-copy"><span className="lang-ko">결제 완료 상태가 아닙니다. 주문 확인 후 결제 안내를 보내드리겠습니다.</span><span className="lang-en">This order has not been paid yet. We’ll send payment instructions after confirming it.</span></p>
      <div className="order-number"><span>Order number</span><strong>{completed.orderNumber}</strong></div>
      <div className="completion-grid">
        <div><p className="section-label">Fulfillment</p><strong>{completed.fulfillment === "delivery" ? <><span className="lang-ko">배송</span><span className="lang-en">Delivery</span></> : <><span className="lang-ko">픽업</span><span className="lang-en">Pickup</span></>}</strong></div>
        <OrderSummary {...completed} />
      </div>
      <Link href="/shop" className="button-primary purchase-button"><span className="lang-ko">커피 더 둘러보기</span><span className="lang-en">Continue shopping</span><span>→</span></Link>
    </main>
  );

  if (!items.length) return <main className="purchase-page"><section className="empty-bag"><p><span className="lang-ko">주문할 상품이 없습니다.</span><span className="lang-en">There’s nothing to check out yet.</span></p><Link href="/shop" className="button-primary purchase-button"><span className="lang-ko">커피 둘러보기</span><span className="lang-en">Browse coffee</span><span>→</span></Link></section></main>;

  const input = (field: keyof FormFields, label: string, props?: { type?: string; inputMode?: "email" | "tel" | "numeric"; autoComplete?: string; optional?: boolean }) => (
    <label className={`checkout-field ${errors[field] ? "has-error" : ""}`}>
      <span>{label}{props?.optional && <small><span className="lang-ko">선택</span><span className="lang-en">Optional</span></small>}</span>
      <input type={props?.type || "text"} inputMode={props?.inputMode} autoComplete={props?.autoComplete} value={form[field]} onChange={(event) => change(field, event.target.value)} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} />
      {errors[field] && <em id={`${field}-error`} role="alert">{errors[field]}</em>}
    </label>
  );

  return (
    <main className="purchase-page checkout-page">
      <header className="purchase-heading"><div><p className="section-label"><span className="lang-ko">간편 주문</span><span className="lang-en">Guest checkout</span></p><h1>Checkout</h1></div><Link href="/cart" className="edit-bag"><span className="lang-ko">장바구니 수정</span><span className="lang-en">Edit bag</span></Link></header>
      <form onSubmit={submit} noValidate className="checkout-layout">
        <div className="checkout-form">
          <section className="checkout-section"><div className="checkout-section-title"><span>01</span><div><p className="section-label">Contact</p><h2><span className="lang-ko">연락처</span><span className="lang-en">Your details</span></h2></div></div><div className="field-grid">{input("customerName", "Name", { autoComplete: "name" })}{input("phone", "Phone", { type: "tel", inputMode: "tel", autoComplete: "tel" })}<div className="field-wide">{input("email", "Email", { type: "email", inputMode: "email", autoComplete: "email" })}</div></div></section>
          <section className="checkout-section"><div className="checkout-section-title"><span>02</span><div><p className="section-label">Fulfillment</p><h2><span className="lang-ko">수령 방법</span><span className="lang-en">How will you get it?</span></h2></div></div><div className="fulfillment-options"><button type="button" className={fulfillment === "delivery" ? "selected" : ""} onClick={() => setFulfillment("delivery")} aria-pressed={fulfillment === "delivery"}><span><strong><span className="lang-ko">배송</span><span className="lang-en">Delivery</span></strong><small><span className="lang-ko">입력한 주소로 보내드려요</span><span className="lang-en">Sent to your address</span></small></span><i /></button><button type="button" className={fulfillment === "pickup" ? "selected" : ""} onClick={() => setFulfillment("pickup")} aria-pressed={fulfillment === "pickup"}><span><strong>Pickup</strong><small><span className="lang-ko">매장에서 직접 수령 · 배송비 없음</span><span className="lang-en">Collect in store · no shipping</span></small></span><i /></button></div></section>
          {fulfillment === "delivery" && <section className="checkout-section delivery-fields"><div className="checkout-section-title"><span>03</span><div><p className="section-label">Delivery</p><h2><span className="lang-ko">배송지</span><span className="lang-en">Delivery address</span></h2></div></div><div className="field-grid"><div className="postal-field">{input("postalCode", "Postal code", { inputMode: "numeric", autoComplete: "postal-code" })}</div><div className="field-wide">{input("address", "Address", { autoComplete: "street-address" })}</div><div className="field-wide">{input("addressDetail", "Address detail", { autoComplete: "address-line2", optional: true })}</div><div className="field-wide">{input("deliveryMessage", "Delivery message", { optional: true })}</div></div></section>}
          {errors.submit && <p className="submit-error" role="alert">{errors.submit}</p>}
        </div>
        <aside className="checkout-summary"><OrderSummary items={items} total={total} fulfillment={fulfillment} /><button type="submit" disabled={submitting} className="button-primary purchase-button"><span>{submitting ? <><span className="lang-ko">접수 중…</span><span className="lang-en">Submitting…</span></> : <><span className="lang-ko">주문 접수하기</span><span className="lang-en">Place order</span></>}</span><span>{money(total)} →</span></button><p className="checkout-note"><span className="lang-ko">회원가입 없이 주문할 수 있습니다. 결제는 아직 진행되지 않습니다.</span><span className="lang-en">No account needed. Payment is not taken at this step.</span></p></aside>
      </form>
    </main>
  );
}
