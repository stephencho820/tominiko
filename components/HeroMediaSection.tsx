"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroMedia } from "@/lib/page-content-config";

const defaultPoster = "/images/home-hero.svg";
const roasteryVideo = "https://ofylmltbenlabrwmucco.supabase.co/storage/v1/object/public/page-images/home/a9fe3e74-dde4-4a27-b9aa-2bd23b0f8aaf.mp4";
const roasteryPoster = "/images/home-roastery-first-frame.webp";
const mobileQuery = "(max-width: 760px)";

export function HeroMediaSection({ media }: { media: HeroMedia }) {
  const [videoUrl, setVideoUrl] = useState("");
  const [playingUrl, setPlayingUrl] = useState("");
  const desktopUrl = media.url.trim();
  const mobileUrl = media.mobileUrl.trim() || desktopUrl;
  const mobileType = media.mobileUrl.trim() ? media.mobileType : media.type;
  const desktopVideoPoster = media.posterUrl?.trim() || (desktopUrl === roasteryVideo ? roasteryPoster : "");
  const desktopPoster = (media.active && (media.type === "image" ? desktopUrl : desktopVideoPoster)) || defaultPoster;
  const mobilePoster = (media.active && (mobileType === "image" ? mobileUrl : media.mobilePosterUrl?.trim())) || desktopPoster;

  useEffect(() => {
    const mobile = window.matchMedia(mobileQuery);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function selectVideo() {
      const type = mobile.matches ? mobileType : media.type;
      const url = mobile.matches ? mobileUrl : desktopUrl;
      setVideoUrl(media.active && !reducedMotion.matches && type === "video" ? url : "");
    }

    selectVideo();
    mobile.addEventListener("change", selectVideo);
    reducedMotion.addEventListener("change", selectVideo);
    return () => {
      mobile.removeEventListener("change", selectVideo);
      reducedMotion.removeEventListener("change", selectVideo);
    };
  }, [desktopUrl, media.active, media.type, mobileType, mobileUrl]);

  return (
    <section className="home-visual-hero" aria-label="Casa di Stefano">
      <picture>
        <source media={mobileQuery} srcSet={mobilePoster} />
        <img className="home-hero-media" src={desktopPoster} alt="" fetchPriority="high" />
      </picture>
      {videoUrl && (
        <video
          key={videoUrl}
          className={`home-hero-media home-hero-video${playingUrl === videoUrl ? " is-playing" : ""}`}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlayThrough={({ currentTarget }) => {
            void currentTarget.play().catch(() => setPlayingUrl(""));
          }}
          onPlaying={() => setPlayingUrl(videoUrl)}
          onError={() => setPlayingUrl("")}
          onWaiting={() => setPlayingUrl("")}
          onEmptied={() => setPlayingUrl("")}
        />
      )}
      {media.overlay && <div className="home-hero-shade" />}
      <Link className="home-hero-cta" href="/shop">SHOP</Link>
    </section>
  );
}
