import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPage({ eyebrow, title, intro, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return <main className="legal-page">
    <header className="legal-hero">
      <p className="section-label">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{intro}</p>
    </header>
    <div className="legal-content">{children}</div>
    <nav className="legal-nav" aria-label="운영 정책">
      <Link href="/terms">이용약관</Link>
      <Link href="/privacy">개인정보처리방침</Link>
      <Link href="/shipping-returns">배송 · 교환 · 환불</Link>
    </nav>
  </main>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="legal-section">
    <h2>{title}</h2>
    <div>{children}</div>
  </section>;
}
