"use client";

import { useEffect, useRef, useState } from "react";
import type { GalleryImage } from "@/lib/page-content-config";

export function TastingRoomGallery({ images }: { images: GalleryImage[] }) {
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const paused = useRef(false);
  const dragging = useRef(false);
  const pointerX = useRef(0);
  const scrollStart = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const loopImages = images.length > 1 ? [...images, ...images, ...images] : images;

  useEffect(() => {
    const element = track.current;
    if (!element || images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const positionMiddle = () => { element.scrollLeft = element.scrollWidth / 3; };
    const id = requestAnimationFrame(positionMiddle);
    let previous = performance.now();
    const tick = (now: number) => {
      if (!paused.current && !dragging.current && !document.hidden) element.scrollLeft += Math.min(now - previous, 32) * .025;
      previous = now;
      const third = element.scrollWidth / 3;
      if (element.scrollLeft >= third * 2) element.scrollLeft -= third;
      else if (element.scrollLeft <= 1) element.scrollLeft += third;
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(frame.current); clearTimeout(resumeTimer.current); };
  }, [images.length]);

  if (!images.length) return null;
  const pause = () => { paused.current = true; clearTimeout(resumeTimer.current); };
  const resume = () => { clearTimeout(resumeTimer.current); resumeTimer.current = setTimeout(() => { paused.current = false; }, 3000); };
  return <div className="room-gallery-viewport" ref={track} onMouseEnter={pause} onMouseLeave={resume}
    onPointerDown={(event) => { if (event.pointerType === "touch") return; pause(); dragging.current = true; setIsDragging(true); pointerX.current = event.clientX; scrollStart.current = event.currentTarget.scrollLeft; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={(event) => { if (dragging.current) event.currentTarget.scrollLeft = scrollStart.current - (event.clientX - pointerX.current); }}
    onPointerUp={(event) => { dragging.current = false; setIsDragging(false); event.currentTarget.releasePointerCapture(event.pointerId); resume(); }}
    onPointerCancel={() => { dragging.current = false; setIsDragging(false); resume(); }} onTouchStart={pause} onTouchEnd={resume} onWheel={() => { pause(); resume(); }} data-dragging={isDragging || undefined}>
    <div className="room-gallery-track">{loopImages.map((image, index) => <figure className="room-gallery-item" key={`${image.id}-${index}`} aria-hidden={index >= images.length && images.length > 1}><img src={image.url} alt={index < images.length ? image.alt : ""} draggable={false} loading={index < 3 ? "eager" : "lazy"} /></figure>)}</div>
  </div>;
}
