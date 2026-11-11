"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProductGallery({ images, productName }: { images: string[]; productName: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  function show(index: number) {
    if (index < 0 || index >= images.length) return;
    setActive(index);
    trackRef.current?.scrollTo({ left: trackRef.current.clientWidth * index, behavior: "smooth" });
  }
  function onScroll() {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setActive(Math.min(images.length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))));
  }
  return (
    <div className="product-gallery">
      <div className="pdp-gallery-track" ref={trackRef} onScroll={onScroll}>
        {images.map((src, index) => (
          <img key={src} src={src} alt={`${productName} · ${index === 0 ? "대표사진" : "콘셉트사진"}`} />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <div className="pdp-gallery-actions" aria-label="상품 사진 탐색">
            <button type="button" onClick={() => show(active - 1)} disabled={active === 0} aria-label="이전 사진">
              <ChevronLeft size={20} />
            </button>
            <span aria-live="polite">{active + 1} / {images.length}</span>
            <button type="button" onClick={() => show(active + 1)} disabled={active === images.length - 1} aria-label="다음 사진">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="pdp-gallery-dots" aria-label="사진 선택">
            {images.map((_, index) => (
              <button key={index} type="button" onClick={() => show(index)}
                aria-label={`${index + 1}번 사진 보기`} aria-current={index === active ? "true" : undefined} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
