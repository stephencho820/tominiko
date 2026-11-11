"use client";

import Link from "next/link";
import { ArrowUpRight, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import type { WelcomeBenefit } from "@/lib/welcome-discount";
import "./welcome-benefit.css";

export function WelcomeBenefitBanner() {
  const [benefit, setBenefit] = useState<WelcomeBenefit | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/welcome-benefit", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<WelcomeBenefit> : null)
      .then((result) => { if (!controller.signal.aborted) setBenefit(result); })
      .catch(() => { if (!controller.signal.aborted) setBenefit(null); });
    return () => controller.abort();
  }, []);

  if (!benefit?.enabled || (benefit.signedIn && !benefit.eligible)) return null;

  const money = benefit.amount.toLocaleString("ko-KR");
  return (
    <aside className="welcome-benefit" aria-label="회원가입 웰컴 혜택">
      <div className="welcome-benefit-icon" aria-hidden="true"><Gift size={18} strokeWidth={1.6} /></div>
      <div className="welcome-benefit-copy">
        <span className="welcome-benefit-kicker">WELCOME BENEFIT</span>
        <strong>{benefit.signedIn ? `첫 주문 ${money}원 할인 혜택이 준비됐어요` : `10초 회원가입, 첫 주문 ${money}원 할인`}</strong>
        <p>가입 후 첫 주문에서 자동 적용 · 계정당 1회</p>
      </div>
      {!benefit.signedIn && (
        <Link className="welcome-benefit-cta" href="/login?mode=sign-up&next=%2Fshop">
          가입하기 <ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true" />
        </Link>
      )}
    </aside>
  );
}
