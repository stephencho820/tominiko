"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

declare global {
  interface Window {
    TossPayments?: ((clientKey: string) => {
      payment: (options: { customerKey: string }) => { requestPayment: (options: Record<string, unknown>) => Promise<void> };
    }) & { ANONYMOUS: string };
  }
}

const loadToss = () => new Promise<void>((resolve, reject) => {
  if (window.TossPayments) return resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.tosspayments.com/v2/standard"]');
  if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); return; }
  const script = document.createElement("script");
  script.src = "https://js.tosspayments.com/v2/standard";
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
  document.head.appendChild(script);
});

function newAccessToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

export default function Checkout() {
  const { items, total } = useCart();
  const [type, setType] = useState("delivery");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ customerName: "", phone: "", email: "", postalCode: "", address: "", addressDetail: "", deliveryMessage: "" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError("");
    try {
      let idempotencyKey = sessionStorage.getItem("tominiko-checkout-reference");
      let accessToken = sessionStorage.getItem("tominiko-order-access-token");
      if (!idempotencyKey || !accessToken) {
        idempotencyKey = crypto.randomUUID(); accessToken = newAccessToken();
        sessionStorage.setItem("tominiko-checkout-reference", idempotencyKey);
        sessionStorage.setItem("tominiko-order-access-token", accessToken);
      }
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fulfillmentType: type, items, idempotencyKey, accessToken }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "주문을 만들지 못했습니다.");
      sessionStorage.setItem("tominiko-payment-order-id", order.orderId);
      await loadToss();
      if (!window.TossPayments) throw new Error("결제 모듈을 시작하지 못했습니다.");
      const toss = window.TossPayments(order.clientKey);
      const payment = toss.payment({ customerKey: window.TossPayments.ANONYMOUS });
      const origin = window.location.origin;
      await payment.requestPayment({
        method: "CARD", amount: { currency: "KRW", value: order.amount }, orderId: order.orderId,
        orderName: order.orderName, successUrl: `${origin}/checkout/success`, failUrl: `${origin}/checkout/fail`,
        customerEmail: form.email, customerName: form.customerName, customerMobilePhone: form.phone.replace(/\D/g, ""),
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "결제를 시작하지 못했습니다.");
      setSubmitting(false);
    }
  };

  if (!items.length) return <main className="px-6 py-24 text-center"><p className="text-2xl">장바구니가 비어 있습니다.</p><Link href="/shop" className="button-secondary eyebrow mt-8 inline-block px-5 py-3">커피 둘러보기</Link></main>;
  return <main className="mx-auto max-w-4xl px-6 py-16 md:px-12"><p className="eyebrow">Almost there</p><h1 className="mt-4 text-6xl">Checkout</h1>
    <form onSubmit={submit} className="mt-12 grid gap-10 md:grid-cols-2"><fieldset className="grid gap-5" disabled={submitting}><legend className="eyebrow mb-5">Customer</legend>
      {([['customerName','이름','text'],['phone','연락처','tel'],['email','이메일','email']] as const).map(([key,label,inputType]) => <label key={key} className="eyebrow">{label}<input required type={inputType} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-2 block w-full border-b border-[#bdb3a5] bg-transparent p-2 text-base normal-case tracking-normal outline-none" /></label>)}
      <div className="mt-5 flex gap-6"><label className="eyebrow"><input type="radio" checked={type === "delivery"} onChange={() => setType("delivery")} /> 배송</label><label className="eyebrow"><input type="radio" checked={type === "pickup"} onChange={() => setType("pickup")} /> 픽업</label></div>
      {type === "delivery" && <div className="grid gap-5">{([['postalCode','우편번호'],['address','주소'],['addressDetail','상세 주소'],['deliveryMessage','배송 메모']] as const).map(([key,label]) => <label key={key} className="eyebrow">{label}<input required={key !== "deliveryMessage"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-2 block w-full border-b border-[#bdb3a5] bg-transparent p-2 text-base normal-case tracking-normal outline-none" /></label>)}</div>}
    </fieldset><aside className="border-t border-[#d8d0c3] pt-5 md:border-l md:border-t-0 md:pl-8"><p className="eyebrow">Order summary</p>
      {items.map((item,index) => <div className="flex justify-between gap-4 border-b border-[#d8d0c3] py-4 text-sm" key={`${item.product.id}-${index}`}><span>{item.product.name} · {item.weight} × {item.quantity}</span><span className="shrink-0">₩{(item.unitPrice * item.quantity).toLocaleString()}</span></div>)}
      <div className="mt-6 flex justify-between text-2xl"><span>합계</span><span>₩{total.toLocaleString()}</span></div><p className="sans mt-2 text-xs text-[#684c38]">결제 금액은 서버의 최신 상품 가격으로 다시 확인됩니다.</p>
      {error && <div role="alert" className="sans mt-5 border border-[#b85b45] bg-[#fff8f4] p-3 text-sm text-[#8a3928]">{error}<br /><span className="text-xs">정보를 확인한 후 다시 시도해 주세요.</span></div>}
      <button disabled={submitting} className="button-primary sans mt-8 w-full p-4 text-xs font-bold tracking-[.16em] disabled:cursor-wait disabled:opacity-60">{submitting ? "결제 준비 중…" : "결제하기"}</button>
      <p className="sans mt-4 text-xs text-[#684c38]">Toss Payments의 안전한 결제창에서 결제합니다.</p>
    </aside></form></main>;
}
