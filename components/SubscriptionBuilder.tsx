"use client";

import { useState } from "react";
import Link from "next/link";
import { requestSubscription } from "@/app/subscription/actions";

const tastes = [
  { value: "roaster_choice", index: "01", title: "로스터 추천", english: "ROASTER'S PICK", detail: "매번 새로운 커피를 발견하는 즐거움", notes: "SURPRISE ME" },
  { value: "blend", index: "02", title: "고소하고 편안한", english: "COMFORT & BALANCE", detail: "견과류와 초콜릿의 부드러운 여운", notes: "NUTTY · CHOCOLATE" },
  { value: "single_origin", index: "03", title: "화사하고 산뜻한", english: "BRIGHT & FLORAL", detail: "과일과 꽃향이 피어나는 한 잔", notes: "FRUITY · FLORAL" },
  { value: "decaf", index: "04", title: "디카페인", english: "DECAF", detail: "카페인 걱정 없이 즐기는 커피", notes: "EASY & GENTLE" },
] as const;

export function SubscriptionBuilder({ signedIn }: { signedIn: boolean }) {
  const [taste, setTaste] = useState<string>("roaster_choice");
  const [weight, setWeight] = useState(400);
  const [frequency, setFrequency] = useState(4);
  const selected = tastes.find(item => item.value === taste) ?? tastes[0];

  return <section className="club-builder" aria-label="커피 클럽 구성">
    <div className="club-section-intro">
      <span className="section-label">MADE FOR YOUR ROUTINE</span>
      <h2>나만의 커피 루틴</h2>
      <p>취향부터 주기까지, 단 세 번의 선택으로 완성하세요.</p>
    </div>
    <form action={requestSubscription} className="club-layout">
      <div className="club-steps">
        <fieldset className="club-step">
          <legend><span>01 / TASTE</span><strong>어떤 커피를 좋아하세요?</strong></legend>
          <div className="club-taste-grid">
            {tastes.map(item => <label key={item.value} className={`club-taste-card ${taste === item.value ? "is-selected" : ""}`}>
              <input type="radio" name="coffee_preference" value={item.value} checked={taste === item.value} onChange={() => setTaste(item.value)} />
              <span className="club-taste-top"><span>{item.index} — {item.english}</span><span className="club-radio-mark" aria-hidden="true" /></span>
              <strong>{item.title}</strong>
              <span className="club-taste-description">{item.detail}</span>
              <span className="club-taste-notes">{item.notes}</span>
            </label>)}
          </div>
        </fieldset>
        <fieldset className="club-step">
          <legend><span>02 / AMOUNT</span><strong>얼마나 마시나요?</strong></legend>
          <div className="club-options">
            {[150, 400].map(value => <label key={value} className={`club-option ${weight === value ? "is-selected" : ""}`}>
              <input type="radio" name="weight_grams" value={value} checked={weight === value} onChange={() => setWeight(value)} />
              <strong>{value}<small>g</small></strong><span>{value === 150 ? "가볍게 즐기기" : "넉넉하게 즐기기"}</span>
            </label>)}
          </div>
        </fieldset>
        <fieldset className="club-step">
          <legend><span>03 / FREQUENCY</span><strong>얼마나 자주 받아보고 싶으세요?</strong></legend>
          <div className="club-options">
            {[2, 4].map(value => <label key={value} className={`club-option ${frequency === value ? "is-selected" : ""}`}>
              <input type="radio" name="frequency_weeks" value={value} checked={frequency === value} onChange={() => setFrequency(value)} />
              <strong>{value}<small>주마다</small></strong><span>{value === 2 ? "자주, 신선하게" : "여유로운 커피 루틴"}</span>
            </label>)}
          </div>
        </fieldset>
      </div>
      <aside className="club-summary">
        <div className="club-summary-top"><span className="section-label">YOUR COFFEE CLUB</span><span>CASA DI STEFANO</span></div>
        <div className="club-summary-symbol" aria-hidden="true">C<span>★</span>S</div>
        <h3>당신을 위한<br/>커피 한 잔의 루틴.</h3>
        <p className="club-summary-description">로스터가 고른 커피를, 당신의 속도에 맞춰.</p>
        <dl>
          <div><dt>COFFEE</dt><dd>{selected.title}</dd></div>
          <div><dt>AMOUNT</dt><dd>{weight}g</dd></div>
          <div><dt>FREQUENCY</dt><dd>{frequency}주마다</dd></div>
        </dl>
        <div className="club-status"><span className="club-status-dot" /> EARLY ACCESS · 사전 신청 접수 중</div>
        <p className="club-disclaimer">현재 구독 신청을 받고 있습니다. 가격과 배송 일정은 추후 안내되며, 신청만으로 결제나 배송이 시작되지 않습니다.</p>
        {signedIn
          ? <button type="submit" className="club-cta">이 구성으로 신청하기 <span aria-hidden="true">↗</span></button>
          : <Link href="/login?next=%2Fsubscription" className="club-cta">로그인하고 신청하기 <span aria-hidden="true">↗</span></Link>}
        <Link href="/shop" className="club-shop-link">먼저 원두 둘러보기 ↗</Link>
      </aside>
    </form>
  </section>;
}
