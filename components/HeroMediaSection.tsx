import type { HeroMedia } from "@/lib/page-content-config";

export function HeroMediaSection({ media }: { media: HeroMedia }) {
  const showMedia = media.active && media.url.trim().length > 0;
  const mobileUrl = media.mobileUrl.trim() || media.url;
  const mobileType = media.mobileUrl.trim() ? media.mobileType : media.type;

  const renderMedia = (url: string, type: "image" | "video", className: string) => type === "video" ? (
    <video className={`home-hero-media ${className}`} src={url} autoPlay muted loop playsInline preload="metadata" />
  ) : <img className={`home-hero-media ${className}`} src={url} alt="Coffee at Casa di Stefano" />;

  return (
    <section className="home-visual-hero" aria-label="Casa di Stefano">
      {showMedia ? <>{renderMedia(media.url, media.type, "home-hero-media-desktop")}{renderMedia(mobileUrl, mobileType, "home-hero-media-mobile")}</> : <div className="home-hero-fallback" />}
      {media.overlay && <div className="home-hero-shade" />}
      <a className="home-hero-cta" href="#discover">
        <span className="lang-ko">내 원두 찾기</span><span className="lang-en">Find my beans</span><span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
