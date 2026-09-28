"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PromotionBanner } from "@/lib/page-content-config";

export function PromotionSlider({ banners }: { banners: PromotionBanner[] }) {
  const visible = banners.filter((banner) => banner.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const [current, setCurrent] = useState(0);
  if (!visible.length) return null;
  const selected = visible[current % visible.length];
  const go = (direction: number) => setCurrent((value) => (value + direction + visible.length) % visible.length);
  return <section className="promotion-section" aria-label="Promotions">
    <a className="promotion-slide" href={selected.hyperlink || "#"} aria-label={selected.alt || "View promotion"}>
      <img src={selected.image} alt={selected.alt || ""} />
    </a>
    {visible.length > 1 && <>
      <button className="promotion-arrow promotion-arrow-left" onClick={() => go(-1)} aria-label="Previous promotion"><ChevronLeft /></button>
      <button className="promotion-arrow promotion-arrow-right" onClick={() => go(1)} aria-label="Next promotion"><ChevronRight /></button>
      <div className="promotion-dots">{visible.map((banner, index) => <button key={banner.id} className={index === current ? "is-active" : ""} onClick={() => setCurrent(index)} aria-label={`Promotion ${index + 1}`} />)}</div>
    </>}
  </section>;
}
