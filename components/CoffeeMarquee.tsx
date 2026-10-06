"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import { productImage, productPricing, productVariants } from "@/lib/products";
import { useCart } from "./CartProvider";

const won = new Intl.NumberFormat("ko-KR");

function CoffeeCard({ product, size, duplicate = false }: { product: Product; size: string; duplicate?: boolean }) {
  const image = productImage(product);
  const variant = productVariants(product).find((item) => item.size === size);
  const pricing = productPricing(product, size, variant);
  const regularPrice = pricing.price;
  const salePrice = pricing.salePrice ?? pricing.price;
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function addProduct(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!variant) return;
    const didAdd = addToCart({ product, variantId: variant.id, weight: variant.size, grind: "Whole Bean", quantity: 1, unitPrice: variant.salePrice ?? variant.price });
    if (!didAdd) return;
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1800);
  }
  return <article className="marquee-coffee-card">
    <Link href={`/shop/${product.slug}`} className="marquee-coffee-link" draggable={false} tabIndex={duplicate ? -1 : undefined}>
      <div className="marquee-coffee-image">
      <img src={image} alt={product.image_url || product.primary_image_url || product.thumbnail_url ? product.name : "Casa di Stefano coffee"} draggable={false} />
      </div>
      <div className="marquee-coffee-copy">
        <p>{product.origin}</p><h3>{product.korean_name || product.name} · {size}</h3>
        <div><span>{product.tasting_notes || product.process || "Small batch roast"}</span><strong className="product-price-pair">{salePrice < regularPrice && <del>₩{won.format(regularPrice)}</del>}<ins>₩{won.format(salePrice)}</ins></strong></div>
      </div>
    </Link>
    <button className="marquee-add" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={addProduct} disabled={!variant} tabIndex={duplicate ? -1 : undefined} aria-live="polite"><ShoppingBag size={13} />{variant ? added ? "ADDED" : "ADD TO CART" : "SOLD OUT"}</button>
  </article>;
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

  if (!products.length) return <section id="coffee-marquee" className="coffee-marquee coffee-marquee-empty"><p className="section-label">TODAY&apos;S ROASTED BEANS</p><Link href="/shop">모든 원두 보기 →</Link></section>;
  const productsBySize = products.flatMap((product) => {
    const sizes = [...new Set(productVariants(product).map((variant) => variant.size))];
    return sizes.map((size) => ({ product, size }));
  });
  const segmentProducts = Array.from({ length: Math.max(1, Math.ceil(6 / productsBySize.length)) }, () => productsBySize).flat();
  return <section id="coffee-marquee" className="coffee-marquee" aria-labelledby="coffee-marquee-title">
    <header><p className="section-label" id="coffee-marquee-title">TODAY&apos;S ROASTED BEANS</p><Link href="/shop"><span className="lang-ko">모든 원두 보기</span><span className="lang-en">View all beans</span> →</Link></header>
    <div className="coffee-marquee-viewport" ref={rail}
      onWheel={() => { pauseUntil.current = performance.now() + 1500; }}
      onPointerDown={(event) => { dragging.current = true; draggedDistance.current = 0; lastX.current = event.clientX; pauseUntil.current = Number.POSITIVE_INFINITY; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (!dragging.current || !rail.current) return; const delta = event.clientX - lastX.current; rail.current.scrollLeft -= delta; draggedDistance.current += Math.abs(delta); lastX.current = event.clientX; }}
      onPointerUp={() => { dragging.current = false; pauseUntil.current = performance.now() + 1500; }}
      onPointerCancel={() => { dragging.current = false; pauseUntil.current = performance.now() + 1500; }}
      onClickCapture={(event) => { if (draggedDistance.current > 8) { event.preventDefault(); event.stopPropagation(); } }}>
      <div className="coffee-marquee-track">{[0, 1].map((groupIndex) => <div className="coffee-marquee-group" ref={groupIndex === 0 ? firstGroup : undefined} aria-hidden={groupIndex !== 0} key={groupIndex}>{segmentProducts.map(({ product, size }, index) => <CoffeeCard key={`${product.id}-${size}-${groupIndex}-${index}`} product={product} size={size} duplicate={groupIndex !== 0} />)}</div>)}</div>
    </div>
  </section>;
}
