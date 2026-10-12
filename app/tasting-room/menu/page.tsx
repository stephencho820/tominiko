import type { Metadata } from "next";
import Link from "next/link";
import { getTastingRoomProducts } from "@/services/products";
import { TastingRoomBeanCard } from "@/components/TastingRoomBeanCard";

export const metadata: Metadata = {
  title: "Tasting Room Menu",
  description: "Casa di Stefano Tasting Room의 커피 메뉴와 현장에서 구매할 수 있는 Tominiko 원두를 확인하세요.",
  alternates: { canonical: "/tasting-room/menu" },
};

const drinks = [
  { category: "BREWED COFFEE", items: [
    ["Today's Filter Coffee", "오늘 준비된 원두를 가장 잘 보여주는 한 잔", "6,000"],
    ["Hand Drip", "원두를 고르면 한 잔씩 천천히 내려드립니다", "7,000"],
    ["Coffee Flight", "서로 다른 커피를 비교해 보는 테이스팅", "12,000"],
  ]},
  { category: "ESPRESSO", items: [
    ["Espresso", "짧고 선명하게", "4,500"],
    ["Americano", "Hot / Ice", "5,000"],
    ["Caffè Latte", "Hot / Ice", "5,500"],
  ]},
  { category: "NON-COFFEE", items: [
    ["Chocolate", "Hot / Ice", "5,500"],
    ["Seasonal Tea", "계절에 따라 달라지는 차", "5,500"],
  ]},
  { category: "SWEET", items: [
    ["Today's Bake", "커피와 함께 준비하는 오늘의 디저트", "Market"],
  ]},
];

export default async function TastingRoomMenuPage() {
  const beans = await getTastingRoomProducts();
  return <main className="tasting-menu-page">
    <header className="tasting-menu-hero">
      <p className="section-label">CASA DI STEFANO · SUWON</p>
      <h1>Tasting Room<br />Menu</h1>
      <p>매장에서 천천히 마시는 한 잔과, 집으로 가져갈 Tominiko 원두.</p>
      <nav aria-label="Menu sections"><a href="#drinks">DRINKS</a><a href="#beans">BEANS</a></nav>
    </header>
    <section id="drinks" className="tasting-menu-section">
      <div className="tasting-menu-section-head"><p className="section-label">DRINKS</p><h2>At the bar</h2><span>현장 주문 · 결제 기능은 운영 시작 시 오픈됩니다.</span></div>
      <div className="tasting-drink-groups">{drinks.map(group => <article key={group.category}><h3>{group.category}</h3>{group.items.map(([name,copy,price]) => <div className="tasting-drink-row" key={name}><div><strong>{name}</strong><p>{copy}</p></div><b>{price === "Market" ? "MARKET" : `₩${price}`}</b></div>)}</article>)}</div>
    </section>
    <section id="beans" className="tasting-menu-section tasting-beans">
      <div className="tasting-menu-section-head"><p className="section-label">BEANS · TAKE HOME</p><h2>Coffee to take home</h2><span>온라인 SHOP과 같은 원두와 재고를 사용합니다. 매장에서는 바로 가져가세요.</span></div>
      {beans.length ? <div className="tasting-bean-grid">{beans.map(product => <TastingRoomBeanCard key={product.id} product={product} />)}</div> : <div className="tasting-menu-empty"><p>매장에서 판매할 원두를 준비 중입니다.</p><Link href="/shop">ONLINE SHOP →</Link></div>}
    </section>
    <footer className="tasting-menu-footer"><Link href="/tasting-room">TASTING ROOM INFO ←</Link><Link href="/shop">ONLINE SHOP →</Link></footer>
  </main>;
}
