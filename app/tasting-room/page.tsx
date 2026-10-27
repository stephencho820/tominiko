import type { Metadata } from "next";
import Link from "next/link";
import { TastingRoomGallery } from "@/components/TastingRoomGallery";
import { SafeHeroImage } from "@/components/SafeHeroImage";
import { getPageSettings } from "@/lib/page-content";
import { BUSINESS_INFO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tasting Room",
  description: "수원 Casa di Stefano Tasting Room에서 Zero Degrees가 로스팅한 Tominiko 커피를 직접 만나보세요.",
  alternates: { canonical: "/tasting-room" },
};

const defaultHero = "/images/tasting-room-banner.svg";
const defaultMobileHero = "/images/tasting-room-banner-mobile.svg";

export default async function TastingRoomPage() {
  const content = await getPageSettings("tasting-room");
  const room = content.tastingRoom!;
  const heroImage = room.heroImage || defaultHero;
  const defaultMapHref = `https://map.naver.com/p/search/${encodeURIComponent("Casa Di Stefano")}`;
  const naverMapHref = /^https:\/\/[^\s]+$/i.test(room.mapLink) ? room.mapLink : defaultMapHref;
  return <main className="tasting-room-page">
    <section className="room-visit-hero"><picture><source media="(max-width: 700px)" srcSet={room.mobileHeroImage || defaultMobileHero} /><SafeHeroImage src={heroImage} fallback={defaultHero} alt="Casa di Stefano Tasting Room" /></picture><Link href="/our-story" className="room-story-link">PHILOSOPHY <span>↗</span></Link></section>
    <section className="room-intro" aria-labelledby="room-intro-title">
      <div><p className="section-label">CASA DI STEFANO</p><h1 id="room-intro-title">향긋한 커피를<br />직접 만나보세요.</h1></div>
      <div><p>커피를 고르기 전에 맛보고 싶을 때, 로스팅 이야기가 궁금할 때, 천천히 머물고 싶을 때 찾아오세요.</p><div className="room-intro-actions"><Link href="/tasting-room/menu">TASTING MENU ↗</Link><a href="#visit">방문 정보 ↓</a><Link href="/shop">원두 SHOP ↗</Link></div></div>
    </section>
    <section className="room-visit" id="visit" aria-labelledby="visit-title"><p className="section-label" id="visit-title">VISIT</p><div className="room-visit-layout">
      <figure className="room-map"><a href={naverMapHref} target="_blank" rel="noopener noreferrer" aria-label="지도에서 Casa Di Stefano 위치 보기" title="Casa Di Stefano 지도 열기"><img src={room.mapImage || "/images/tasting-room/map-casa-user.svg"} alt="Casa di Stefano Tasting Room location map in Suwon" /></a></figure>
      <div className="room-visit-details">
        <div><h2>ADDRESS</h2>{room.address ? <><p className="room-preline">{room.address}</p>{naverMapHref && <a className="room-detail-action" href={naverMapHref} target="_blank" rel="noreferrer">지도에서 위치 보기 ↗</a>}</> : <p className="room-empty">Details coming soon.</p>}</div>
        <div><h2>CONTACT</h2><a href={BUSINESS_INFO.contactUrl} target="_blank" rel="noopener noreferrer">카카오톡 오픈프로필 ↗</a><p className="room-phone-note">방문 및 예약 문의는 카카오톡으로 연락해 주세요.</p></div>
        <div><h2>OPENING HOURS</h2>{room.openingHours ? <p className="room-preline">{room.openingHours}</p> : <p className="room-empty">Details coming soon.</p>}</div>
      </div>
    </div></section>
    <section className="room-space" aria-labelledby="space-title"><p className="section-label" id="space-title">THE SPACE</p><TastingRoomGallery images={room.galleryImages} /></section>
  </main>;
}
