import { ShopCatalog } from "@/components/ShopCatalog";
import { getProducts } from "@/services/products";
import { getPageSettings } from "@/lib/page-content";

export default async function Shop() {
  const [products, content] = await Promise.all([
    getProducts({ activeOnly: true }),
    getPageSettings("shop"),
  ]);
  const introKo = content.texts.intro_ko?.value || "취향에 맞는 원두를 만나보세요.";
  const introEn = content.texts.intro_en?.value || "Find the coffee that fits your taste.";
  return <main className="shop-page shop-page-new">
    <header className="shop-heading"><p className="section-label">TOMINIKO Beans &amp; Coffee Shop</p><p><span className="lang-ko">{introKo}</span><span className="lang-en">{introEn}</span></p></header>
    <ShopCatalog products={products} />
  </main>;
}
