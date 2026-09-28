import { getProducts } from "@/services/products";
import Link from "next/link";
import { CoffeeDiscovery } from "@/components/CoffeeDiscovery";
import { PageText } from "@/components/PageText";
import { getPageSettings } from "@/lib/page-content";
import { TodaysRoast } from "@/components/TodaysRoast";

export default async function Home() {
  const products = await getProducts({ activeOnly: true });
  const content = await getPageSettings("home");
  const shopContent = await getPageSettings("shop");
  const todaysRoast = products.find((product) => product.todays_roast)
    ?? products.find((product) => product.featured)
    ?? products[0];

  return <main className="home-page">
    <div className="home-shop-landing">
      <section className="home-shop-intro" aria-labelledby="home-shop-title">
        <p className="section-label">Coffee</p>
        <h1 id="home-shop-title"><PageText className="lang-ko" setting={shopContent.texts.title_ko} /><PageText className="lang-en" setting={shopContent.texts.title_en} /></h1>
        <p><PageText className="lang-ko" setting={shopContent.texts.subtitle_ko} /><PageText className="lang-en" setting={shopContent.texts.subtitle_en} /></p>
      </section>
      {todaysRoast && <TodaysRoast product={todaysRoast} />}
    </div>
    <CoffeeDiscovery products={products} />
    <section className="home-brand-teaser"><div><p className="section-label">The roastery</p><h2><PageText className="lang-ko" setting={content.texts.brand_title_ko} /><PageText className="lang-en" setting={content.texts.brand_title_en} /></h2></div><div><p><PageText className="lang-ko" setting={content.texts.brand_body_ko} /><PageText className="lang-en" setting={content.texts.brand_body_en} /></p><Link href="/zero-degrees"><span className="lang-ko">로스팅 철학 보기</span><span className="lang-en">Our roasting philosophy</span> →</Link></div></section>
    <section className="home-closing"><p className="eyebrow">Tominiko Beans &amp; Coffee</p><h2><PageText className="lang-ko" setting={content.texts.closing_ko} /><PageText className="lang-en" setting={content.texts.closing_en} /></h2><div><Link href="/shop" className="button-primary home-shop-link"><span className="lang-ko">모든 커피 보기</span><span className="lang-en">Browse all coffee</span> ↗</Link><Link href="/tasting-room" className="home-text-link"><span className="lang-ko">테이스팅 룸 방문</span><span className="lang-en">Visit the tasting room</span> →</Link></div></section>
  </main>;
}
