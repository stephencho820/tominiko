import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { PageSettings } from "@/lib/page-content-config";

const illustrations = {
  casa: { src: "/images/philosophy/tasting-room.png", width: 1120, height: 1400, alt: "Hand pouring coffee into a dripper" },
  zero: { src: "/images/philosophy/zero-degrees.png", width: 1280, height: 1280, alt: "Zero Degrees small batch coffee roaster" },
  tominiko: { src: "/images/philosophy/tominiko.png", width: 1280, height: 1280, alt: "Tominiko coffee bag" },
} as const;

function BrandLogo({ src, fallback, alt, scale }: { src?: string; fallback: string; alt: string; scale: number }) {
  return <div className="brand-scene__logo" style={{ "--logo-scale": scale } as CSSProperties}>
    {src ? <img src={src} alt={alt} /> : <span>{fallback}</span>}
  </div>;
}

function TastingRoomOverlay() {
  return <span className="casa-drop" aria-hidden="true" />;
}

function RoasterSmoke() {
  return <span className="roaster-steam" aria-hidden="true">
    {[0, 1, 2].map((line) => <span key={line}>
      <svg viewBox="0 0 18 42" focusable="false"><path d="M10 41 C2 32, 16 25, 8 16 C3 10, 11 6, 9 1" /></svg>
    </span>)}
  </span>;
}

function HeroBrandItem({ href, className, label, image, logo, fallback, alt, scale, microcopy, overlay }: {
  href: string; className: string; label: string; image: (typeof illustrations)[keyof typeof illustrations]; logo?: string;
  fallback: string; alt: string; scale: number; microcopy: string; overlay?: ReactNode;
}) {
  const motionClass = className === "brand-scene--tominiko" ? " tominiko-motion" : "";
  const contents = <article className="philosophy-card"><div className="brand-scene__art philosophy-visual"><div className={`philosophy-illustration${motionClass}`}><Image src={image.src} width={image.width} height={image.height} sizes="(max-width: 768px) 75vw, 340px" alt={image.alt} priority />{overlay}</div></div><div className="brand-scene__identity philosophy-copy"><BrandLogo src={logo} fallback={fallback} alt={alt} scale={scale} /><p>{microcopy} <b aria-hidden="true">{href.startsWith("#") ? "↓" : "↗"}</b></p></div></article>;
  return href.startsWith("#")
    ? <a href={href} className={`brand-scene ${className}`} aria-label={label}>{contents}</a>
    : <Link href={href} className={`brand-scene ${className}`} aria-label={label}>{contents}</Link>;
}

export function OurStoryHero({ settings }: { settings: PageSettings }) {
  const scale = (key: string) => Math.min(1.2, Math.max(.8, Number.parseInt(settings.texts[key]?.value || "100", 10) / 100));
  const alt = (key: string, fallback: string) => settings.texts[key]?.value || fallback;
  return <section className="brand-stage" aria-labelledby="philosophy-heading">
    <header className="brand-stage__heading">
      <p className="section-label">PHILOSOPHY</p>
      <h1 id="philosophy-heading">하나의 집,<br />세 가지 이야기.</h1>
      <p>커피를 볶고, 맛보고, 당신의 하루에 건넵니다.</p>
    </header>
    <div className="brand-stage__scenes">
      <HeroBrandItem href="/shop" className="brand-scene--tominiko" label="Shop Tominiko coffee" image={illustrations.tominiko} logo={settings.images.tominiko_logo} fallback="TOMINIKO" alt={alt("tominiko_logo_alt", "Tominiko")} scale={scale("tominiko_logo_scale")} microcopy="SHOP COFFEE" />
      <HeroBrandItem href="#zero-degrees" className="brand-scene--zero" label="Explore Zero Degrees roasting philosophy" image={illustrations.zero} overlay={<RoasterSmoke />} logo={settings.images.zero_logo} fallback="ZERO DEGREES" alt={alt("zero_logo_alt", "Zero Degrees")} scale={scale("zero_logo_scale")} microcopy="ROASTING PHILOSOPHY" />
      <HeroBrandItem href="/tasting-room" className="brand-scene--casa" label="Visit Casa di Stefano Tasting Room" image={illustrations.casa} overlay={<TastingRoomOverlay />} logo={settings.images.casa_logo} fallback="CASA DI STEFANO" alt={alt("casa_logo_alt", "Casa di Stefano")} scale={scale("casa_logo_scale")} microcopy="TASTING ROOM" />
    </div>
  </section>;
}
