import type { Metadata } from "next";
import { ShopCatalog } from "@/components/ShopCatalog";
import { getProducts } from "@/services/products";
import { getPageSettings } from "@/lib/page-content";

export const metadata: Metadata = {
  title: "CASA DI STEFANO | 원두 온라인 쇼핑몰",
  description: "Tominiko의 블렌드, 싱글 오리진, 디카페인 커피를 만나보세요. Zero Degrees가 수원에서 로스팅합니다.",
  alternates: { canonical: "/shop" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "CASA DI STEFANO",
    title: "CASA DI STEFANO | 원두 온라인 쇼핑몰",
    description: "TOMINIKO BEANS & COFFEE · ZERO DEGREES ROASTERS. 블렌드, 싱글 오리진, 디카페인 원두를 만나보세요.",
    url: "/shop",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CASA DI STEFANO 커피 쇼핑몰" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CASA DI STEFANO | 원두 온라인 쇼핑몰",
    description: "TOMINIKO BEANS & COFFEE · ZERO DEGREES ROASTERS",
    images: ["/opengraph-image"],
  },
};

export default async function Shop() {
  const [products, content] = await Promise.all([
    getProducts({ activeOnly: true }),
    getPageSettings("shop"),
  ]);
  const introKo = content.texts.intro_ko?.value || "취향에 맞는 원두를 만나보세요.";
  const introEn = content.texts.intro_en?.value || "Find the coffee that fits your taste.";
  return <main className="shop-page shop-page-new">
    <header className="shop-heading"><p className="section-label">TOMINIKO COFFEE SHOP · ROASTED BY ZERO DEGREES AT CASA DI STEFANO</p><p><span className="lang-ko">{introKo}</span><span className="lang-en">{introEn}</span></p></header>
    <ShopCatalog products={products} />
  </main>;
}
