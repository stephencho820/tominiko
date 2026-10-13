import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTastingRoomProducts } from "@/services/products";
import { getTastingMenuItems } from "@/services/tasting-menu";
import { TastingRoomOrderMenu } from "@/components/TastingRoomOrderMenu";

export const metadata: Metadata = { title:"Tasting Room Menu",description:"Casa di Stefano Tasting Room에서 커피와 원두를 주문하고 결제하세요.",alternates:{canonical:"/tasting-room/menu"} };

export default async function TastingRoomMenuPage(){
 const [beans,menu]=await Promise.all([getTastingRoomProducts(),getTastingMenuItems()]);
 return <main className="tasting-menu-page">
  <header className="tasting-menu-hero"><p className="section-label">CASA DI STEFANO · SUWON</p><h1>Order at the bar.</h1><p>메뉴를 고르고 결제한 뒤, 주문번호가 불리면 카운터에서 픽업하세요.</p><nav aria-label="Menu sections"><a href="#drinks">DRINKS</a><a href="#beans">BEANS</a></nav></header>
  <Suspense fallback={<p className="tasting-menu-empty">메뉴를 준비하고 있습니다…</p>}><TastingRoomOrderMenu menu={menu} beans={beans}/></Suspense>
  <footer className="tasting-menu-footer"><Link href="/tasting-room">TASTING ROOM INFO ←</Link><Link href="/shop">ONLINE SHOP →</Link></footer>
 </main>
}