import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { CartProvider } from "@/components/CartProvider";
import { BUSINESS_INFO, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";
import "./globals.css";

const baseUrl = siteUrl();

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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
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
        <SiteChrome footer={<footer className="site-footer site-footer-complete">
          <div className="site-footer-brand">
            <p className="eyebrow">CASA DI STEFANO</p>
            <p className="mt-2 sans text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">TOMINIKO BEANS &amp; COFFEE · ROASTED BY ZERO DEGREES</p>
          </div>
          <div className="site-footer-info">
            <p>{BUSINESS_INFO.address}</p>
            <a href={BUSINESS_INFO.contactUrl} target="_blank" rel="noopener noreferrer">카카오톡으로 문의하기 ↗</a>
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
