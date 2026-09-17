import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { CartProvider } from "@/components/CartProvider";
import "./globals.css";

export const metadata: Metadata = { title: "Casa di Stefano | Small Batch Coffee", description: "서울에서 매주 로스팅하는 스몰 배치 커피." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" data-lang="ko"><body><CartProvider><Header /><div className="site-shell">{children}</div><footer className="site-footer"><div><p className="eyebrow">CASA DI STEFANO</p><p className="mt-2 sans text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">TOMINIKO BEANS &amp; COFFEE · ROASTED BY ZERO DEGREES</p></div><p className="sans text-xs text-[var(--muted)]"><span className="lang-ko">수원, 대한민국</span><span className="lang-en">Suwon, South Korea</span></p></footer></CartProvider></body></html>;
}