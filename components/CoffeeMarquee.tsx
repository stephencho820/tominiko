"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";

const won = new Intl.NumberFormat("ko-KR");

function CoffeeCard({ product }: { product: Product }) {
  return <Link href={`/shop/${product.slug}`} className="marquee-coffee-card" draggable={false}>
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
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = rail.current;
    if (!element || products.length === 0) return;
    let frame = 0;
    let previous = performance.now();
    const move = (time: number) => {
      if (!paused && !dragging.current) element.scrollLeft += Math.min(time - previous, 32) * 0.025;
      const segment = element.scrollWidth / 3;
      if (segment && element.scrollLeft >= segment * 2) element.scrollLeft -= segment;
      if (segment && element.scrollLeft <= 0) element.scrollLeft += segment;
      previous = time;
      frame = requestAnimationFrame(move);
    };
    element.scrollLeft = element.scrollWidth / 3;
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [paused, products.length]);

  if (!products.length) return <section id="coffee-marquee" className="coffee-marquee coffee-marquee-empty"><p className="section-label">TODAY&apos;S COFFEE</p><h2>오늘 준비된 커피</h2><Link href="/shop">SHOP 보기 →</Link></section>;
  const repeated = [...products, ...products, ...products];
  return <section id="coffee-marquee" className="coffee-marquee" aria-labelledby="coffee-marquee-title">
    <header><div><p className="section-label">TODAY&apos;S COFFEE</p><h2 id="coffee-marquee-title"><span className="lang-ko">오늘 준비된 커피</span><span className="lang-en">Coffee for today</span></h2></div><Link href="/shop"><span className="lang-ko">모든 커피 보기</span><span className="lang-en">View all coffee</span> →</Link></header>
    <div className="coffee-marquee-viewport" ref={rail} onMouseEnter={() => setPaused(true)} onMouseLeave={() => { dragging.current = false; setPaused(false); }} onPointerDown={(event) => { dragging.current = true; lastX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!dragging.current || !rail.current) return; rail.current.scrollLeft -= event.clientX - lastX.current; lastX.current = event.clientX; }} onPointerUp={() => { dragging.current = false; }}>
      <div className="coffee-marquee-track">{repeated.map((product, index) => <CoffeeCard key={`${product.id}-${index}`} product={product} />)}</div>
    </div>
  </section>;
}
