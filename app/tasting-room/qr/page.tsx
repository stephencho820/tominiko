import type { Metadata } from "next";
import { Suspense } from "react";
import { getTastingRoomProducts } from "@/services/products";
import { getTastingMenuItems } from "@/services/tasting-menu";
import { TastingRoomOrderMenu } from "@/components/TastingRoomOrderMenu";

export const metadata: Metadata = { title:"Tasting Room · QR Order",description:"Casa di Stefano 매장 방문 고객을 위한 QR 주문 및 결제 페이지입니다.",robots:{index:false,follow:false} };

export default async function TastingRoomMenuPage(){
 const [beans,menu]=await Promise.all([getTastingRoomProducts(),getTastingMenuItems()]);
 return <main className="tasting-menu-page">
  <header className="tasting-menu-hero"><p className="section-label">CASA DI STEFANO · SUWON</p><h1>Order at the bar.</h1><p>메뉴를 고르고 결제한 뒤, 주문번호가 불리면 카운터에서 픽업하세요.</p><nav aria-label="Menu sections"><a href="#drinks">DRINKS</a><a href="#beans">BEANS</a></nav></header>
  <Suspense fallback={<p className="tasting-menu-empty">메뉴를 준비하고 있습니다…</p>}><TastingRoomOrderMenu menu={menu} beans={beans}/></Suspense>
 </main>
}