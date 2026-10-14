import type { Metadata } from "next";
import Link from "next/link";
import { getTastingRoomProducts } from "@/services/products";
import { getTastingMenuItems } from "@/services/tasting-menu";
import { defaultProductVariant } from "@/lib/products";

export const metadata: Metadata = {
  title: "Tasting Room Menu",
  description: "Casa di Stefano 테이스팅룸의 음료와 원두 메뉴를 확인하세요.",
  alternates: { canonical: "/tasting-room/menu" },
};

const money = (amount: number) => `₩${amount.toLocaleString("ko-KR")}`;
const categories = [["brewed", "BREWED COFFEE"], ["espresso", "ESPRESSO"], ["non-coffee", "NON-COFFEE"], ["sweet", "SWEET"]] as const;

export default async function TastingRoomMenuPage() {
  const [beans, menu] = await Promise.all([getTastingRoomProducts(), getTastingMenuItems()]);
  return <main className="tasting-menu-page">
    <header className="tasting-menu-hero">
      <p className="section-label">CASA DI STEFANO · SUWON</p>
      <h1>At the bar.</h1>
      <p>테이스팅룸에서 만나볼 수 있는 메뉴를 소개합니다. 매장 주문은 방문 후 QR 코드를 이용해 주세요.</p>
      <nav aria-label="Menu sections"><a href="#drinks">DRINKS</a><a href="#beans">BEANS</a></nav>
    </header>
    <section id="drinks" className="tasting-menu-section">
      <div className="tasting-menu-section-head"><p className="section-label">DRINKS</p><h2>Our menu</h2><span>메뉴 및 가격 안내 · 온라인 주문 불가</span></div>
      <div className="tasting-drink-groups">
        {categories.map(([category, label]) => <article key={category}>
          <h3>{label}</h3>
          {menu.filter(item => item.category === category).map(item => <div className="tasting-drink-row" key={item.id}>
            <div><strong>{item.name}</strong>{item.description && <p>{item.description}</p>}<b>{money(item.price)}</b></div>
            <div className="tasting-option-actions">{item.sold_out ? <span>SOLD OUT</span> : <span>{[item.hot_available && "HOT", item.iced_available && "ICE"].filter(Boolean).join(" / ")}</span>}</div>
          </div>)}
        </article>)}
      </div>
    </section>
    <section id="beans" className="tasting-menu-section tasting-beans">
      <div className="tasting-menu-section-head"><p className="section-label">BEANS · TAKE HOME</p><h2>Coffee to take home</h2><span>매장에서 만나볼 수 있는 원두</span></div>
      <div className="tasting-bean-grid">{beans.map(bean => { const variant = defaultProductVariant(bean, "150g"); return <article className="tasting-bean-card" key={bean.id}>
        <div><p className="section-label">{bean.origin}</p><h3>{bean.name}</h3><p>{bean.tasting_notes}</p><strong>{variant ? money(variant.salePrice ?? variant.price) : "SOLD OUT"} <small>150g</small></strong></div>
      </article>; })}</div>
    </section>
    <footer className="tasting-menu-footer"><Link href="/tasting-room">TASTING ROOM INFO ←</Link><Link href="/shop">ONLINE SHOP →</Link></footer>
  </main>;
}
