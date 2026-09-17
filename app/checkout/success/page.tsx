"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";

type CompletedOrder = { order_number: string; total: number; fulfillment_type: string; payment_status: string; order_items: Array<{ product_name: string; weight: string; grind: string; quantity: number; subtotal: number }> };

export default function PaymentSuccess() {
  const params = useSearchParams();
  const { clear } = useCart();
  const started = useRef(false);
  const [order, setOrder] = useState<CompletedOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return; started.current = true;
    const paymentKey = params.get("paymentKey"), orderId = params.get("orderId"), amount = Number(params.get("amount"));
    const accessToken = sessionStorage.getItem("tominiko-order-access-token");
    if (!paymentKey || !orderId || !Number.isInteger(amount) || !accessToken) { setError("결제 확인 정보가 없습니다."); return; }
    fetch("/api/payments/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentKey, orderId, amount, accessToken }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then((data) => { setOrder(data.order); clear(); sessionStorage.removeItem("tominiko-checkout-reference"); sessionStorage.removeItem("tominiko-payment-order-id"); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "결제를 확인하지 못했습니다."));
  }, [params, clear]);

  if (error) return <main className="mx-auto max-w-2xl px-6 py-24 text-center"><p className="eyebrow text-[#8a3928]">Payment not completed</p><h1 className="mt-5 text-5xl">결제를 완료하지 못했습니다.</h1><p className="sans mt-6 text-sm text-[var(--muted)]">{error}</p><div className="mt-10 flex justify-center gap-6"><Link className="button-primary px-6 py-3 sans text-xs" href="/checkout">다시 시도</Link><Link className="button-secondary px-6 py-3 sans text-xs" href="/cart">장바구니</Link></div></main>;
  if (!order) return <main className="px-6 py-24 text-center"><p className="eyebrow">결제를 안전하게 확인하고 있습니다…</p></main>;
  return <main className="mx-auto max-w-2xl px-6 py-20"><div className="text-center"><p className="eyebrow">Order complete</p><h1 className="mt-5 text-6xl">주문이 완료되었습니다.</h1><p className="sans mt-5 text-sm text-[var(--muted)]">주문 번호 <strong className="text-[var(--ink)]">{order.order_number}</strong></p></div><section className="mt-12 border-y border-[var(--line)]">
    {order.order_items.map((item,index) => <div key={index} className="flex justify-between gap-5 border-b border-[var(--line)] py-4 last:border-0"><span>{item.product_name} · {item.weight} · {item.grind} × {item.quantity}</span><span>₩{item.subtotal.toLocaleString()}</span></div>)}
  </section><div className="mt-6 flex justify-between text-2xl"><span>결제 금액</span><span>₩{order.total.toLocaleString()}</span></div><p className="sans mt-3 text-sm text-[var(--muted)]">수령 방법: {order.fulfillment_type === "delivery" ? "배송" : "픽업"}</p><div className="mt-10 text-center"><Link href="/shop" className="button-primary inline-block px-7 py-3 sans text-xs">쇼핑 계속하기</Link></div></main>;
}
