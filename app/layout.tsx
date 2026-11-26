import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { CartProvider } from "@/components/CartProvider";
import { BUSINESS_INFO, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";
import "./globals.css";
import "./typography.css";

const baseUrl = siteUrl();
const shareTitle = "Casa di Stefano 공식 온라인 스토어";
const shareDescription = "커피 로스터리 Casa di Stefano. Zero Degrees가 볶은 Tominiko 원두를 만나보세요.";
const shareImage = {
  url: "/images/casa-forest-share.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "안개 낀 숲을 배경으로 한 Casa di Stefano",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: shareTitle,
    description: shareDescription,
    url: "/",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: [shareImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko">
    <body>
      <CartProvider>
        <AnalyticsTracker />
        <SiteChrome footer={<footer className="site-footer site-footer-complete">
          <div className="site-footer-brand">
            <p className="eyebrow">CASA DI STEFANO</p>
            <p className="mt-2 sans text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">TOMINIKO BEANS &amp; COFFEE · ROASTED BY ZERO DEGREES</p>
          </div>
          <div className="site-footer-info">
            <p>{BUSINESS_INFO.address}</p>
            <a href={BUSINESS_INFO.contactUrl} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기 ↗</a>
            <a href={`mailto:${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a>
            <a href={`tel:${BUSINESS_INFO.contactPhone.replace(/-/g, "")}`}>전화 문의 · {BUSINESS_INFO.contactPhone}</a>
            <p className="site-footer-prelaunch">사업자등록정보 · 통신판매업 신고정보는 정식 오픈 전에 업데이트됩니다.</p>
          </div>
          <nav className="site-footer-policy" aria-label="운영 정책">
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/shipping-returns">배송 · 교환 · 환불</Link>
          </nav>
        </footer>}>
          {children}
        </SiteChrome>
      </CartProvider>
    </body>
  </html>;
}
