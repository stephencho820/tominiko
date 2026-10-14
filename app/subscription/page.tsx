import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Coffee Subscription | Casa di Stefano", description: "커피 정기구독을 준비 중입니다. 원하는 원두와 배송 주기를 살펴보세요." };

export default async function SubscriptionPage() {
  let signedIn = false;
  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }
  return <main className="mx-auto max-w-5xl px-6 py-16 md:px-12 md:py-24">
    <p className="section-label">CASA DI STEFANO · COFFEE SUBSCRIPTION</p>
    <h1 className="mt-6 text-5xl md:text-7xl">Good coffee,<br/>on your rhythm.</h1>
    <p className="mt-8 max-w-2xl text-lg text-[var(--muted)]">매일 마시는 커피를 더 편리하게. 취향에 맞는 원두를 원하는 주기로 받아보는 정기구독을 준비하고 있습니다.</p>
    <section className="mt-14 grid gap-5 md:grid-cols-3" aria-label="정기구독 안내">
      <article className="rounded border border-[var(--line)] p-7"><p className="section-label">01 · CHOOSE</p><h2 className="mt-4 text-2xl">Your coffee</h2><p className="mt-3 text-[var(--muted)]">블렌드와 싱글 오리진 중 취향에 맞는 커피를 선택하세요.</p></article>
      <article className="rounded border border-[var(--line)] p-7"><p className="section-label">02 · FREQUENCY</p><h2 className="mt-4 text-2xl">Your pace</h2><p className="mt-3 text-[var(--muted)]">2주 또는 4주 간격 등 나에게 맞는 배송 주기를 계획하세요.</p></article>
      <article className="rounded border border-[var(--line)] p-7"><p className="section-label">03 · DELIVERY</p><h2 className="mt-4 text-2xl">Freshly roasted</h2><p className="mt-3 text-[var(--muted)]">로스팅 일정과 배송 정책은 서비스 시작 전에 안내됩니다.</p></article>
    </section>
    <div className="mt-12 rounded border border-[var(--line)] bg-[var(--ivory)] p-8">
      <h2 className="text-2xl">Coming soon</h2>
      <p className="mt-3 text-[var(--muted)]">현재 정기구독 신청 및 자동 결제는 제공되지 않습니다. 시작 전까지는 일반 주문으로 커피를 구매할 수 있습니다.</p>
      <div className="mt-6 flex flex-wrap gap-4"><Link href="/shop" className="button-primary px-6 py-4">커피 둘러보기 ↗</Link><Link href={signedIn ? "/account" : "/login"} className="button-secondary px-6 py-4">{signedIn ? "내 계정 ↗" : "회원 로그인 ↗"}</Link></div>
    </div>
  </main>;
}
