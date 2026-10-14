import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { requestSubscription } from "./actions";

export const metadata: Metadata = { title: "Coffee Subscription | Casa di Stefano", description: "커피 정기구독을 준비 중입니다. 원하는 원두와 배송 주기를 살펴보세요." };

export default async function SubscriptionPage() {
  let signedIn = false;
  let requests: { id: string; coffee_preference: string; frequency_weeks: number; weight_grams: number; status: string; created_at: string }[] = [];
  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) { const { data } = await supabase.from("coffee_subscriptions").select("id,coffee_preference,frequency_weeks,weight_grams,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10); requests = data ?? []; }
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
    {signedIn && <section className="mt-12 rounded border border-[var(--line)] p-8"><h2 className="text-2xl">정기구독 상담 신청</h2><p className="mt-2 text-[var(--muted)]">신청 내용을 확인한 뒤 운영자가 연락드립니다. 신청만으로 결제나 배송이 시작되지 않습니다.</p><form action={requestSubscription} className="mt-6 grid gap-5 md:grid-cols-3"><label>커피 취향<select className="mt-2 w-full border p-3" name="coffee_preference" required><option value="roaster_choice">로스터 추천</option><option value="blend">블렌드</option><option value="single_origin">싱글 오리진</option><option value="decaf">디카페인</option></select></label><label>배송 희망 주기<select className="mt-2 w-full border p-3" name="frequency_weeks" required><option value="2">2주</option><option value="4">4주</option></select></label><label>원두 중량<select className="mt-2 w-full border p-3" name="weight_grams" required><option value="150">150g</option><option value="400">400g</option></select></label><button type="submit" className="button-primary px-6 py-4 md:col-span-3">상담 신청하기 ↗</button></form><h3 className="mt-8 text-xl">내 신청 내역</h3>{requests.length ? <div className="mt-3 space-y-3">{requests.map(r => <p key={r.id} className="border-b py-3">{r.coffee_preference} · {r.weight_grams}g · {r.frequency_weeks}주 · {r.status}</p>)}</div> : <p className="mt-3 text-[var(--muted)]">아직 신청 내역이 없습니다.</p>}</section>}
    <div className="mt-12 rounded border border-[var(--line)] bg-[var(--ivory)] p-8">
      <h2 className="text-2xl">Coming soon</h2>
      <p className="mt-3 text-[var(--muted)]">정기구독 상담 신청은 가능하지만 자동 결제와 정기 배송은 아직 제공되지 않습니다. 시작 전까지는 일반 주문으로 커피를 구매할 수 있습니다.</p>
      <div className="mt-6 flex flex-wrap gap-4"><Link href="/shop" className="button-primary px-6 py-4">커피 둘러보기 ↗</Link><Link href={signedIn ? "/account" : "/login"} className="button-secondary px-6 py-4">{signedIn ? "내 계정 ↗" : "회원 로그인 ↗"}</Link></div>
    </div>
  </main>;
}
