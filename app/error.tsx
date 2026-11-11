"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[site] page data unavailable", error); }, [error]);
  return <main className="mx-auto max-w-2xl px-6 py-24 text-center" role="alert">
    <p className="section-label">CASA DI STEFANO</p>
    <h1 className="mt-6 text-3xl">페이지 정보를 불러오지 못했습니다.</h1>
    <p className="mt-5 text-sm text-[var(--muted)]">연결 상태를 확인하고 다시 시도해 주세요.</p>
    <div className="mt-8 flex justify-center gap-4">
      <button type="button" className="button-primary px-6 py-3" onClick={() => reset()}>다시 시도</button>
      <Link href="/" className="button-secondary px-6 py-3">홈으로</Link>
    </div>
  </main>;
}
