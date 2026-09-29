import Link from "next/link";
import { TastingRoomGallery } from "@/components/TastingRoomGallery";
import { SafeHeroImage } from "@/components/SafeHeroImage";
import { getPageSettings } from "@/lib/page-content";

const defaultHero = "/images/tasting-room-banner.svg";

export default async function TastingRoomPage() {
  const content = await getPageSettings("tasting-room");
  const room = content.tastingRoom!;
  const heroImage = room.heroImage || defaultHero;
  const phoneHref = room.phone.replace(/[^\d+]/g, "");
  return <main className="tasting-room-page">
    <section className="room-visit-hero"><picture>{room.mobileHeroImage && <source media="(max-width: 700px)" srcSet={room.mobileHeroImage} />}<SafeHeroImage src={heroImage} fallback={defaultHero} alt="Casa di Stefano Tasting Room" /></picture><Link href="/our-story" className="room-story-link">PHILOSOPHY <span>↗</span></Link></section>
    <section className="room-visit" aria-labelledby="visit-title"><p className="section-label" id="visit-title">VISIT</p><div className="room-visit-layout">
      <figure className="room-map"><img src="/images/tasting-room/map.svg" alt="Casa di Stefano Tasting Room location map" /></figure>
      <div className="room-visit-details">
        <div><h2>ADDRESS</h2>{room.address ? <p className="room-preline">{room.address}</p> : <p className="room-empty">Details coming soon.</p>}</div>
        <div><h2>PHONE</h2>{room.phone ? <a href={phoneHref ? `tel:${phoneHref}` : undefined}>{room.phone}</a> : <p className="room-empty">Details coming soon.</p>}{room.phoneNote && <p className="room-phone-note">{room.phoneNote}</p>}</div>
        <div><h2>OPENING HOURS</h2>{room.openingHours ? <p className="room-preline">{room.openingHours}</p> : <p className="room-empty">Details coming soon.</p>}</div>
      </div>
    </div></section>
    <section className="room-space" aria-labelledby="space-title"><p className="section-label" id="space-title">THE SPACE</p><TastingRoomGallery images={room.galleryImages} /></section>
  </main>;
}
