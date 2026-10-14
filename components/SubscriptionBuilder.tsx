"use client";

import { useState } from "react";
import Link from "next/link";
import { requestSubscription } from "@/app/subscription/actions";

const tastes = [
  { value: "roaster_choice", title: "로스터 추천", detail: "오늘 가장 맛있는 커피를 골라드려요" },
  { value: "blend", title: "고소하고 편안한", detail: "견과류와 초콜릿 같은 편안한 맛" },
  { value: "single_origin", title: "화사하고 산뜻한", detail: "과일과 꽃향이 느껴지는 커피" },
  { value: "decaf", title: "디카페인", detail: "카페인 부담 없이 즐기는 커피" },
] as const;

export function SubscriptionBuilder({ signedIn }: { signedIn: boolean }) {
  const [taste, setTaste] = useState<string>("roaster_choice");
  const [weight, setWeight] = useState(400);
  const [frequency, setFrequency] = useState(4);
  const selected = tastes.find(item => item.value === taste) ?? tastes[0];
  return <section className="mt-14" aria-label="커피 구독 구성">
    <p className="section-label">YOUR COFFEE CLUB</p>
    <h2 className="mt-3 text-3xl md:text-4xl">내 취향대로 구성하기</h2>
    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">로스터가 취향에 맞는 원두를 큐레이션합니다. 아래에서 원하는 구성을 선택해 보세요.</p>
    <form action={requestSubscription} className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-10">
        <fieldset><legend className="mb-4 text-lg font-semibold">01. 어떤 커피를 좋아하세요?</legend>
          <div className="grid gap-3 sm:grid-cols-2">{tastes.map(item => <label key={item.value} className={`cursor-pointer rounded border p-5 transition-colors ${taste === item.value ? "border-[var(--ink)] bg-[var(--ivory)]" : "border-[var(--line)]"}`}>
            <input className="sr-only" type="radio" name="coffee_preference" value={item.value} checked={taste === item.value} onChange={() => setTaste(item.value)} />
            <span className="flex items-center justify-between gap-3 text-base font-semibold">{item.title}<span aria-hidden="true">{taste === item.value ? "●" : "○"}</span></span>
            <span className="mt-2 block text-xs leading-6 text-[var(--muted)]">{item.detail}</span>
          </label>)}</div>
        </fieldset>
        <fieldset><legend className="mb-4 text-lg font-semibold">02. 얼마나 마시나요?</legend>
          <div className="grid grid-cols-2 gap-3">{[150,400].map(value => <label key={value} className={`cursor-pointer rounded border p-5 text-center font-semibold ${weight === value ? "border-[var(--ink)] bg-[var(--ivory)]" : "border-[var(--line)]"}`}><input className="sr-only" type="radio" name="weight_grams" value={value} checked={weight === value} onChange={() => setWeight(value)} />{value}g</label>)}</div>
        </fieldset>
        <fieldset><legend className="mb-4 text-lg font-semibold">03. 얼마나 자주 받아보고 싶으세요?</legend>
          <div className="grid grid-cols-2 gap-3">{[2,4].map(value => <label key={value} className={`cursor-pointer rounded border p-5 text-center font-semibold ${frequency === value ? "border-[var(--ink)] bg-[var(--ivory)]" : "border-[var(--line)]"}`}><input className="sr-only" type="radio" name="frequency_weeks" value={value} checked={frequency === value} onChange={() => setFrequency(value)} />{value}주마다</label>)}</div>
        </fieldset>
      </div>
      <aside className="h-fit rounded border border-[var(--line)] bg-[var(--ivory)] p-7 lg:sticky lg:top-28">
        <p className="section-label">YOUR SELECTION</p>
        <h3 className="mt-5 text-2xl">나의 커피 구독</h3>
        <dl className="mt-6 space-y-4 border-y border-[var(--line)] py-5 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">취향</dt><dd className="font-semibold">{selected.title}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">중량</dt><dd>{weight}g</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">희망 주기</dt><dd>{frequency}주마다</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">구독 가격</dt><dd>운영자 안내 예정</dd></div>
        </dl>
        <p className="mt-5 text-xs leading-6 text-[var(--muted)]">현재 정기구독은 사전 접수 단계입니다. 신청만으로 결제·배송이 시작되지 않으며 자동결제도 진행되지 않습니다.</p>
        {signedIn ? <button type="submit" className="button-primary mt-6 w-full px-5 py-4">이 구성으로 구독 신청하기 →</button> : <Link href="/login?next=%2Fsubscription" className="button-primary mt-6 block px-5 py-4 text-center">로그인하고 구독 신청하기 →</Link>}
        <Link href="/shop" className="mt-4 block text-center text-xs underline underline-offset-4">먼저 원두 구매하기 →</Link>
      </aside>
    </form>
  </section>;
}
