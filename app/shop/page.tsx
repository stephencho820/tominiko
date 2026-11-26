import type { Metadata } from "next";
import { ShopCatalog } from "@/components/ShopCatalog";
import { WelcomeBenefitBanner } from "@/components/WelcomeBenefitBanner";
import { getProducts } from "@/services/products";

export const metadata: Metadata = {
  title: "Zero Degrees Coffee Roasters",
  description: "Tominiko의 블렌드, 싱글 오리진, 디카페인 커피를 만나보세요. Zero Degrees가 수원에서 로스팅합니다.",
  alternates: { canonical: "/shop" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "CASA DI STEFANO",
    title: "Zero Degrees Coffee Roasters",
    description: "TOMINIKO BEANS & COFFEE · ZERO DEGREES ROASTERS. 블렌드, 싱글 오리진, 디카페인 원두를 만나보세요.",
    url: "/shop",
    images: [{ url: "/shop/opengraph-image", width: 1200, height: 630, alt: "Zero Degrees Coffee Roasters" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zero Degrees Coffee Roasters",
    description: "TOMINIKO BEANS & COFFEE · ZERO DEGREES ROASTERS",
    images: ["/shop/opengraph-image"],
  },
};

export default async function Shop() {
  const products = await getProducts({ activeOnly: true });
  return <main className="shop-page shop-page-new" aria-label="원두 쇼핑">
    <WelcomeBenefitBanner />
    <ShopCatalog products={products} />
  </main>;
}
