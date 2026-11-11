"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[shop] unable to load product data", error); }, [error]);
  return <main className="mx-auto max-w-2xl px-6 py-24 text-center" role="alert">
    <p className="section-label">CASA DI STEFANO · COFFEE SHOP</p>
    <h1 className="mt-6 text-3xl">커피 정보를 불러오지 못했습니다.</h1>
    <p className="mt-5 text-sm text-[var(--muted)]">일시적으로 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>
    <div className="mt-8 flex justify-center gap-4">
      <button type="button" className="button-primary px-6 py-3" onClick={() => reset()}>다시 시도</button>
      <Link href="/" className="button-secondary px-6 py-3">홈으로</Link>
    </div>
  </main>;
}
