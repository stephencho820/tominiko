import { getProducts } from "@/services/products";
import Link from "next/link";
import { CoffeeDiscovery } from "@/components/CoffeeDiscovery";
import { PageText } from "@/components/PageText";
import { getPageSettings } from "@/lib/page-content";

export default async function Home() {
  const products = await getProducts({ activeOnly: true });
  const content = await getPageSettings("home");

  return <main className="home-page">
    <section className="new-home-hero" style={content.images.hero ? { backgroundImage: `linear-gradient(rgba(20,16,12,.18),rgba(20,16,12,.18)),url(${content.images.hero})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      <div className="new-home-hero-grain" />
      <div className="new-home-hero-copy">
        <PageText as="p" className="eyebrow" setting={content.texts.hero_eyebrow} />
        <h1><PageText className="lang-ko" setting={content.texts.hero_title_ko} /><PageText className="lang-en" setting={content.texts.hero_title_en} /></h1>
        <p><PageText className="lang-ko" setting={content.texts.hero_body_ko} /><PageText className="lang-en" setting={content.texts.hero_body_en} /></p>
        <a href="#discover" className="hero-discover-link"><span className="lang-ko">내 커피 찾기</span><span className="lang-en">Find my coffee</span><span>↓</span></a>
      </div>
      <div className="new-home-hero-aside"><span>Roasted by</span><strong>ZERO<br />DEGREES</strong><small>Thoughtfully measured.<br />Never overworked.</small></div>
    </section>
    <CoffeeDiscovery products={products} />
    <section className="home-brand-teaser"><div><p className="section-label">The roastery</p><h2><PageText className="lang-ko" setting={content.texts.brand_title_ko} /><PageText className="lang-en" setting={content.texts.brand_title_en} /></h2></div><div><p><PageText className="lang-ko" setting={content.texts.brand_body_ko} /><PageText className="lang-en" setting={content.texts.brand_body_en} /></p><Link href="/zero-degrees"><span className="lang-ko">로스팅 철학 보기</span><span className="lang-en">Our roasting philosophy</span> →</Link></div></section>
    <section className="home-closing"><p className="eyebrow">Tominiko Beans &amp; Coffee</p><h2><PageText className="lang-ko" setting={content.texts.closing_ko} /><PageText className="lang-en" setting={content.texts.closing_en} /></h2><div><Link href="/shop" className="button-primary home-shop-link"><span className="lang-ko">모든 커피 보기</span><span className="lang-en">Browse all coffee</span> ↗</Link><Link href="/tasting-room" className="home-text-link"><span className="lang-ko">테이스팅 룸 방문</span><span className="lang-en">Visit the tasting room</span> →</Link></div></section>
  </main>;
}
