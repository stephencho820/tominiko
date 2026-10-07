import { ShopCatalog } from "@/components/ShopCatalog";
import { getProducts } from "@/services/products";

export default async function Shop() {
  const products = await getProducts({ activeOnly: true });
  return <main className="shop-page shop-page-new">
    <header className="shop-heading"><p className="section-label">TOMINIKO Beans &amp; Coffee Shop</p><p><span className="lang-ko">취향에 맞는 원두를 만나보세요.</span><span className="lang-en">Find the coffee that fits your taste.</span></p></header>
    <ShopCatalog products={products} />
  </main>;
}
