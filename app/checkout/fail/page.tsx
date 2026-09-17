"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
export default function PaymentFail() {
  const params = useSearchParams();
  const message = params.get("message") || "결제가 취소되었거나 승인되지 않았습니다.";
  useEffect(() => {
    const orderId = params.get("orderId"), accessToken = sessionStorage.getItem("tominiko-order-access-token");
    if (orderId && accessToken) fetch("/api/payments/fail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, accessToken, code: params.get("code"), message }) });
  }, [params, message]);
  return <main className="mx-auto max-w-2xl px-6 py-24 text-center"><p className="eyebrow text-[#8a3928]">Payment interrupted</p><h1 className="mt-5 text-5xl">결제가 완료되지 않았습니다.</h1><p className="sans mt-6 text-sm text-[var(--muted)]">{message}</p><p className="sans mt-2 text-xs text-[var(--muted)]">장바구니는 그대로 유지되며 같은 주문으로 다시 시도할 수 있습니다.</p><div className="mt-10 flex justify-center gap-6"><Link className="button-primary px-6 py-3 sans text-xs" href="/checkout">다시 시도</Link><Link className="button-secondary px-6 py-3 sans text-xs" href="/cart">장바구니로</Link></div></main>;
}
