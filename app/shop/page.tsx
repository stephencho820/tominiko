import { ShopCatalog } from "@/components/ShopCatalog";
import { getProducts } from "@/services/products";

export default async function Shop() {
  const products = await getProducts({ activeOnly: true });
  return <main className="shop-page shop-page-new">
    <header className="shop-heading"><p className="section-label">TOMINIKO COFFEE SHOP <span aria-hidden="true">|</span> ROASTED ZERO DEGREES AT CASA DI STEFANO</p><p><span className="lang-ko">오늘 로스팅한 커피를 만나보세요.</span><span className="lang-en">Meet the coffees we roasted today.</span></p></header>
    <ShopCatalog products={products} />
  </main>;
}
