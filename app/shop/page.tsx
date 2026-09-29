import { ShopCatalog } from "@/components/ShopCatalog";
import { getProducts } from "@/services/products";

export default async function Shop() {
  const products = await getProducts({ activeOnly: true });
  return <main className="shop-page shop-page-new">
    <header className="shop-heading"><p className="section-label">TOMINIKO Beans &amp; Coffee Shop</p><p><span className="lang-ko">오늘 로스팅한 원두를 만나보세요.</span><span className="lang-en">Meet the beans we roasted today.</span></p></header>
    <ShopCatalog products={products} />
  </main>;
}
