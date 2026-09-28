"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Product } from "@/types";

const won = new Intl.NumberFormat("ko-KR");

function CoffeeCard({ product, duplicate = false }: { product: Product; duplicate?: boolean }) {
  const image = product.primary_image_url || product.image_url || product.thumbnail_url || "/images/coffee-card-fallback.svg";
  return <Link href={`/shop/${product.slug}`} className="marquee-coffee-card" draggable={false} tabIndex={duplicate ? -1 : undefined}>
    <div className="marquee-coffee-image">
      <img src={image} alt={product.image_url || product.primary_image_url || product.thumbnail_url ? product.name : "Casa di Stefano coffee"} draggable={false} />
    </div>
    <div className="marquee-coffee-copy">
      <p>{product.origin}</p><h3>{product.name}</h3>
      <div><span>{product.tasting_notes || product.process || "Small batch roast"}</span><strong>₩{won.format(product.price_150g)}</strong></div>
    </div>
  </Link>;
}

export function CoffeeMarquee({ products }: { products: Product[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const firstGroup = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const draggedDistance = useRef(0);
  const pauseUntil = useRef(0);

  useEffect(() => {
    const element = rail.current;
    const group = firstGroup.current;
    if (!element || !group || products.length === 0) return;

    let frame = 0;
    let startTimer = 0;
    let groupWidth = group.getBoundingClientRect().width;
    let previousTime = 0;
    let running = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const measure = () => { groupWidth = group.getBoundingClientRect().width; };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(group);

    const move = (time: number) => {
      if (!previousTime) previousTime = time;
      const elapsed = Math.min(time - previousTime, 32);

      if (!reducedMotion.matches && !dragging.current && time >= pauseUntil.current) {
        element.scrollLeft += elapsed * 0.04;
      }

      if (groupWidth > 0) {
        while (element.scrollLeft >= groupWidth) element.scrollLeft -= groupWidth;
        while (element.scrollLeft < 0) element.scrollLeft += groupWidth;
      }

      previousTime = time;
      frame = requestAnimationFrame(move);
    };

    // Give product imagery one paint to settle before measuring and starting.
    // The guard makes this safe when React Strict Mode mounts the effect twice.
    startTimer = window.setTimeout(() => {
      measure();
      if (!running) {
        running = true;
        frame = requestAnimationFrame(move);
      }
    }, 500);

    return () => {
      running = false;
      window.clearTimeout(startTimer);
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [products.length]);

  if (!products.length) return <section id="coffee-marquee" className="coffee-marquee coffee-marquee-empty"><p className="section-label">TODAY&apos;S COFFEE</p><h2>오늘 준비된 커피</h2><Link href="/shop">SHOP 보기 →</Link></section>;
  const segmentProducts = Array.from({ length: Math.max(1, Math.ceil(6 / products.length)) }, () => products).flat();
  return <section id="coffee-marquee" className="coffee-marquee" aria-labelledby="coffee-marquee-title">
    <header><div><p className="section-label">TODAY&apos;S COFFEE</p><h2 id="coffee-marquee-title"><span className="lang-ko">오늘 준비된 커피</span><span className="lang-en">Coffee for today</span></h2></div><Link href="/shop"><span className="lang-ko">모든 커피 보기</span><span className="lang-en">View all coffee</span> →</Link></header>
    <div className="coffee-marquee-viewport" ref={rail}
      onWheel={() => { pauseUntil.current = performance.now() + 1500; }}
      onPointerDown={(event) => { dragging.current = true; draggedDistance.current = 0; lastX.current = event.clientX; pauseUntil.current = Number.POSITIVE_INFINITY; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (!dragging.current || !rail.current) return; const delta = event.clientX - lastX.current; rail.current.scrollLeft -= delta; draggedDistance.current += Math.abs(delta); lastX.current = event.clientX; }}
      onPointerUp={() => { dragging.current = false; pauseUntil.current = performance.now() + 1500; }}
      onPointerCancel={() => { dragging.current = false; pauseUntil.current = performance.now() + 1500; }}
      onClickCapture={(event) => { if (draggedDistance.current > 8) { event.preventDefault(); event.stopPropagation(); } }}>
      <div className="coffee-marquee-track">{[0, 1].map((groupIndex) => <div className="coffee-marquee-group" ref={groupIndex === 0 ? firstGroup : undefined} aria-hidden={groupIndex !== 0} key={groupIndex}>{segmentProducts.map((product, index) => <CoffeeCard key={`${product.id}-${groupIndex}-${index}`} product={product} duplicate={groupIndex !== 0} />)}</div>)}</div>
    </div>
  </section>;
}
