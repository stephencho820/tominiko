import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { SubscriptionBuilder } from "@/components/SubscriptionBuilder";

export const metadata: Metadata = { title: "Coffee Subscription | Casa di Stefano", description: "취향에 맞는 커피를 로스터가 큐레이션하는 Casa di Stefano 커피 클럽." };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ requested?: string; already?: string; error?: string }> }) {
  const notice = await searchParams;
  let signedIn = false;
  let requests: { id: string; coffee_preference: string; frequency_weeks: number; weight_grams: number; status: string; created_at: string }[] = [];
  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) { const { data } = await supabase.from("coffee_subscriptions").select("id,coffee_preference,frequency_weeks,weight_grams,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10); requests = data ?? []; }
  }
  return <main className="club-page">
    <div className="club-page-inner">
    <div className="club-hero"><div className="club-hero-copy"><p className="section-label">CASA DI STEFANO / COFFEE CLUB</p>
    <h1>Good coffee,<br/><em>on your rhythm.</em></h1>
    <p className="club-hero-desc">좋아하는 맛을 고르면, 로스터가 커피를 큐레이션합니다.<br/>당신의 일상에 맞는 커피 루틴을 만들어보세요.</p><a href="#club-start" className="club-hero-link">BUILD YOUR CLUB <span aria-hidden="true">↘</span></a></div><div className="club-hero-art" aria-hidden="true"><div className="club-art-ring"><span>CASA<br/>DI STEFANO</span><small>COFFEE CLUB · EST. 2026</small></div><span className="club-art-caption">A LITTLE RITUAL, EVERY DAY.</span></div></div>{(notice.requested === "1" || notice.already === "1" || notice.error) && <p role={notice.error ? "alert" : "status"} className="mx-auto max-w-4xl px-6 py-5 text-sm" aria-live="polite">{notice.error === "invalid" ? "선택한 구독 구성을 다시 확인해 주세요." : notice.error ? "구독 신청을 저장하지 못했습니다. 다시 시도해 주세요." : notice.already === "1" ? "동일한 구성의 신청이 이미 접수되어 있습니다. 아래에서 내 신청 내역을 확인하세요." : "사전 신청이 접수되었습니다. 정기결제나 배송은 아직 시작되지 않습니다."}</p>}
    <div id="club-start">
    <SubscriptionBuilder signedIn={signedIn} /></div>
    {requests.length > 0 && <section className="club-history" aria-label="내 구독 신청 내역">
      <div className="club-history-heading"><div><p className="section-label">MY COFFEE CLUB</p><h2>내 구독 신청 내역</h2></div><span>{requests.length}건의 신청</span></div>
      <div className="club-history-list">{requests.map(r => {
        const names: Record<string, string> = { roaster_choice: "로스터 추천", blend: "고소하고 편안한", single_origin: "화사하고 산뜻한", decaf: "디카페인" };
        return <article className="club-history-item" key={r.id}>
          <div className="club-history-item-main"><span className="club-history-label">COFFEE SELECTION</span><h3>{names[r.coffee_preference] ?? r.coffee_preference}</h3><p>{r.weight_grams}g <span aria-hidden="true">·</span> {r.frequency_weeks}주마다</p></div>
          <div className="club-history-item-meta"><span className="club-history-pill">{r.status === "requested" ? "신청 접수" : r.status}</span><time dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</time></div>
        </article>;
      })}</div>
    </section>}
    <p className="mt-12 text-xs leading-6 text-[var(--muted)]">구독 서비스의 가격, 정기결제 및 배송 일정은 확정 후 안내합니다. 지금은 신청 접수만 가능하며, 즉시 원두를 구매하려면 <Link href="/shop" className="underline underline-offset-4">온라인 숍</Link>을 이용해 주세요.</p>
    </div>
  </main>;
}
