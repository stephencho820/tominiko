import type { HeroMedia } from "@/lib/page-content-config";

export function HeroMediaSection({ media }: { media: HeroMedia }) {
  const showMedia = media.active && media.url.trim().length > 0;

  return (
    <section className="home-visual-hero" aria-label="Casa di Stefano">
      {showMedia && media.type === "video" ? (
        <video className="home-hero-media" src={media.url} autoPlay muted loop playsInline preload="metadata" />
      ) : showMedia ? (
        <img className="home-hero-media" src={media.url} alt="Coffee at Casa di Stefano" />
      ) : <div className="home-hero-fallback" />}
      {media.overlay && <div className="home-hero-shade" />}
      <a className="home-hero-cta" href="#coffee-marquee">
        <span className="lang-ko">내 커피 찾기</span><span className="lang-en">Find my coffee</span><span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
