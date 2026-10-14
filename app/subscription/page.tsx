import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { SubscriptionBuilder } from "@/components/SubscriptionBuilder";

export const metadata: Metadata = { title: "Coffee Subscription | Casa di Stefano", description: "취향에 맞는 커피를 로스터가 큐레이션하는 Casa di Stefano 커피 클럽." };

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
    <p className="section-label">CASA DI STEFANO · COFFEE CLUB</p>
    <h1 className="mt-6 text-5xl md:text-7xl">Good coffee,<br/>on your rhythm.</h1>
    <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--muted)]">내가 좋아하는 맛을 고르면, 로스터가 그 취향에 맞는 커피를 큐레이션합니다. 원하는 양과 주기를 선택해 보세요.</p>
    <SubscriptionBuilder signedIn={signedIn} />
    {requests.length > 0 && <section className="mt-16 border-t border-[var(--line)] pt-10"><h2 className="text-2xl">내 구독 신청 내역</h2><div className="mt-5 space-y-3">{requests.map(r => <p key={r.id} className="border-b border-[var(--line)] py-3 text-sm">{r.coffee_preference} · {r.weight_grams}g · {r.frequency_weeks}주 · {r.status === "requested" ? "접수됨" : r.status}</p>)}</div></section>}
    <p className="mt-12 text-xs leading-6 text-[var(--muted)]">구독 서비스의 가격, 정기결제 및 배송 일정은 확정 후 안내합니다. 지금은 신청 접수만 가능하며, 즉시 원두를 구매하려면 <Link href="/shop" className="underline underline-offset-4">온라인 숍</Link>을 이용해 주세요.</p>
  </main>;
}
