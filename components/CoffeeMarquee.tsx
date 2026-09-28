"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Product } from "@/types";

const won = new Intl.NumberFormat("ko-KR");

function CoffeeCard({ product, duplicate = false }: { product: Product; duplicate?: boolean }) {
  return <Link href={`/shop/${product.slug}`} className="marquee-coffee-card" draggable={false} tabIndex={duplicate ? -1 : undefined}>
    <div className="marquee-coffee-image">
      {product.image_url ? <img src={product.image_url} alt="" draggable={false} /> : <span>{product.origin || "Coffee"}</span>}
    </div>
    <div className="marquee-coffee-copy">
      <p>{product.origin}</p><h3>{product.name}</h3>
      <div><span>{product.tasting_notes || product.process || "Small batch roast"}</span><strong>₩{won.format(product.price_150g)}</strong></div>
    </div>
  </Link>;
}

export function CoffeeMarquee({ products }: { products: Product[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const draggedDistance = useRef(0);
  const pauseUntil = useRef(0);

  useEffect(() => {
    const element = rail.current;
    if (!element || products.length === 0) return;
    let frame = 0;
    let previous = performance.now();
    let positioned = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const move = (time: number) => {
      const segment = element.scrollWidth / 3;
      if (!positioned && segment) { element.scrollLeft = segment; positioned = true; }
      if (!reducedMotion.matches && !dragging.current && time >= pauseUntil.current) {
        element.scrollLeft += Math.min(time - previous, 32) * 0.035;
      }
      if (segment && element.scrollLeft >= segment * 2) element.scrollLeft -= segment;
      if (segment && element.scrollLeft < segment * .25) element.scrollLeft += segment;
      previous = time;
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
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
      <div className="coffee-marquee-track">{[0, 1, 2].map((group) => <div className="coffee-marquee-group" aria-hidden={group !== 1} key={group}>{segmentProducts.map((product, index) => <CoffeeCard key={`${product.id}-${group}-${index}`} product={product} duplicate={group !== 1} />)}</div>)}</div>
    </div>
  </section>;
}
