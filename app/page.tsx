import { getProducts } from "@/services/products";
import Link from "next/link";
import { CoffeeDiscovery } from "@/components/CoffeeDiscovery";

export default async function Home() {
  const products = await getProducts({ activeOnly: true });

  return <main className="home-page">
    <section className="new-home-hero">
      <div className="new-home-hero-grain" />
      <div className="new-home-hero-copy">
        <p className="eyebrow">Casa di Stefano · Suwon</p>
        <h1><span className="lang-ko">오늘의 기분에 맞는<br /><i>좋은 커피 한 잔.</i></span><span className="lang-en">Good coffee,<br /><i>for today.</i></span></h1>
        <p><span className="lang-ko">수원에서 작은 배치로 로스팅하는<br />Tominiko Beans &amp; Coffee.</span><span className="lang-en">Tominiko Beans &amp; Coffee,<br />roasted in small batches in Suwon.</span></p>
        <a href="#discover" className="hero-discover-link"><span className="lang-ko">내 커피 찾기</span><span className="lang-en">Find my coffee</span><span>↓</span></a>
      </div>
      <div className="new-home-hero-aside"><span>Roasted by</span><strong>ZERO<br />DEGREES</strong><small>Thoughtfully measured.<br />Never overworked.</small></div>
    </section>
    <CoffeeDiscovery products={products} />
    <section className="home-brand-teaser"><div><p className="section-label">The roastery</p><h2><span className="lang-ko">더하지 않고,<br />가리지 않는 로스팅.</span><span className="lang-en">Nothing added.<br />Nothing hidden.</span></h2></div><div><p><span className="lang-ko">데이터로 이해하고 경험으로 결정합니다. 커피가 가진 고유한 인상을 조용히 선명하게 만드는 것이 Zero Degrees의 방식입니다.</span><span className="lang-en">We understand with data and decide with experience—making each coffee's character quietly clear.</span></p><Link href="/zero-degrees"><span className="lang-ko">로스팅 철학 보기</span><span className="lang-en">Our roasting philosophy</span> →</Link></div></section>
    <section className="home-closing"><p className="eyebrow">Tominiko Beans &amp; Coffee</p><h2><span className="lang-ko">천천히 만들고,<br /><i>쉽게 고르는 커피.</i></span><span className="lang-en">Made slowly.<br /><i>Chosen easily.</i></span></h2><div><Link href="/shop" className="button-primary home-shop-link"><span className="lang-ko">모든 커피 보기</span><span className="lang-en">Browse all coffee</span> ↗</Link><Link href="/tasting-room" className="home-text-link"><span className="lang-ko">테이스팅 룸 방문</span><span className="lang-en">Visit the tasting room</span> →</Link></div></section>
  </main>;
}
