import Link from "next/link";
import type { PageSettings } from "@/lib/page-content-config";

function BrandLogo({ src, fallback, alt, scale }: { src?: string; fallback: string; alt: string; scale: number }) {
  return <div className="brand-scene__logo" style={{ "--logo-scale": scale } as React.CSSProperties}>
    {src ? <img src={src} alt={alt} /> : <span role="img" aria-label={alt}>{fallback}</span>}
  </div>;
}

function Dripper() {
  return <svg className="brand-illustration" viewBox="0 0 260 260" role="img" aria-label="Coffee slowly dripping from a dripper into a glass server">
    <g className="illustration-line"><path d="M75 62h108l-21 58H96Z"/><path d="M88 62l9-18h64l13 18"/><path d="M112 120v17"/><path d="M91 147c0-8 8-14 17-14h48c9 0 16 6 17 14l7 57c1 9-6 16-15 16h-66c-9 0-16-7-15-16Z"/><path d="M174 157c29-1 29 39 4 41"/><path className="coffee-level" d="M91 190c24 5 54-5 83 0l2 17c1 5-4 9-9 9H98c-5 0-10-4-9-9Z"/></g><ellipse className="coffee-drop" cx="133" cy="139" rx="3" ry="5" />
  </svg>;
}

function Roaster() {
  return <svg className="brand-illustration" viewBox="0 0 260 260" role="img" aria-label="Small batch coffee roaster with gentle rising steam">
    <g className="smoke"><path className="smoke-one" d="M126 57c-13-13 10-19-1-34"/><path className="smoke-two" d="M145 56c12-15-9-22 3-39"/><path className="smoke-three" d="M163 61c-7-12 12-18 5-31"/></g><g className="illustration-line"><path d="M91 70h77l9 33H82Z"/><rect x="66" y="103" width="128" height="103" rx="8"/><circle cx="130" cy="148" r="35"/><circle cx="130" cy="148" r="7"/><path d="M95 206v24m70-24v24M78 119h20m64 0h20"/><path className="roaster-drum" d="M108 175c14 8 31 8 44 0"/></g>
  </svg>;
}

function CoffeeBag() {
  return <svg className="brand-illustration coffee-bag" viewBox="0 0 260 260" role="img" aria-label="A finished bag of Tominiko coffee beans">
    <g className="illustration-line"><path className="bag-body" d="M83 51h94l10 172H73Z"/><path d="M83 72h95M78 197h106"/><rect x="101" y="103" width="58" height="61" rx="2"/><path d="M116 130c6-12 22-12 28 0-6 13-22 13-28 0Z"/><path d="M130 119c-1 8-2 17 0 24"/></g><text x="130" y="153" textAnchor="middle">TOMINIKO</text>
  </svg>;
}

export function OurStoryHero({ settings }: { settings: PageSettings }) {
  const number = (key: string) => Math.min(1.2, Math.max(.8, Number.parseInt(settings.texts[key]?.value || "100", 10) / 100));
  const alt = (key: string, fallback: string) => settings.texts[key]?.value || fallback;
  return <section className="brand-stage" aria-label="One house, three expressions of coffee">
    <header className="brand-stage__heading"><p>PHILOSOPHY</p><span>ONE HOUSE, THREE STORIES.</span></header>
    <div className="brand-stage__landscape" aria-hidden="true"><span /><span /><span /></div>
    <div className="brand-stage__scenes">
      <Link href="/tasting-room" className="brand-scene brand-scene--casa" aria-label="Visit Casa di Stefano Tasting Room">
        <div className="brand-scene__art"><Dripper /></div>
        <div className="brand-scene__identity"><BrandLogo src={settings.images.casa_logo} fallback="CASA DI STEFANO" alt={alt("casa_logo_alt", "Casa di Stefano")} scale={number("casa_logo_scale")} /><p>TASTING ROOM</p><span>VISIT <b>↗</b></span></div>
      </Link>
      <a href="#zero-degrees" className="brand-scene brand-scene--zero" aria-label="Read the Zero Degrees roasting philosophy">
        <div className="brand-scene__art"><Roaster /></div>
        <div className="brand-scene__identity"><BrandLogo src={settings.images.zero_logo} fallback="ZERO DEGREES" alt={alt("zero_logo_alt", "Zero Degrees")} scale={number("zero_logo_scale")} /><p>ROASTING PHILOSOPHY</p><span>EXPLORE <b>↓</b></span></div>
      </a>
      <Link href="/shop" className="brand-scene brand-scene--tominiko" aria-label="Shop Tominiko coffee">
        <div className="brand-scene__art"><CoffeeBag /></div>
        <div className="brand-scene__identity"><BrandLogo src={settings.images.tominiko_logo} fallback="TOMINIKO" alt={alt("tominiko_logo_alt", "Tominiko")} scale={number("tominiko_logo_scale")} /><p>SHOP COFFEE</p><span>SHOP <b>↗</b></span></div>
      </Link>
    </div>
  </section>;
}
