"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DISCOVERY_TAGS, hasDiscoveryTag, type DiscoveryTag } from "@/lib/discovery";
import type { Product } from "@/types";
import { ProductPurchase } from "./ProductPurchase";

function ProductImage({ product }: { product: Product }) {
  return <div className="discovery-product-image grain">
    {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="discovery-image-fallback"><span>Tominiko</span><small>{product.origin}</small></div>}
  </div>;
}

export function CoffeeDiscovery({ products }: { products: Product[] }) {
  const initial = products.some((product) => product.todays_roast) ? "todays-roast" : null;
  const [selected, setSelected] = useState<DiscoveryTag | null>(initial);
  const resultRef = useRef<HTMLDivElement>(null);
  const intent = DISCOVERY_TAGS.find((tag) => tag.value === selected);
  const matches = useMemo(() => {
    if (!selected) return [];
    const tagged = products.filter((product) => hasDiscoveryTag(product.discovery_tags, selected));
    if (selected === "todays-roast") {
      const roast = products.filter((product) => product.todays_roast);
      return [...roast, ...tagged.filter((product) => !product.todays_roast)];
    }
    return tagged;
  }, [products, selected]);
  const recommendations = matches.length ? matches : products.filter((product) => product.todays_roast || product.featured);
  const primary = recommendations[0] ?? products[0];

  function choose(value: DiscoveryTag) {
    setSelected(value);
    requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 700px)").matches) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return <section className="coffee-discovery" id="discover" aria-labelledby="discovery-title">
    <div className="discovery-heading">
      <div><p className="section-label">Find your coffee</p><h2 id="discovery-title"><span className="lang-ko">오늘 어떤 커피가<br />끌리세요?</span><span className="lang-en">What sounds good<br />today?</span></h2></div>
      <p><span className="lang-ko">지금 마음에 가까운 취향을 골라보세요.<br />오늘 준비된 커피 중 잘 어울리는 한 잔을 골라드릴게요.</span><span className="lang-en">Choose what feels closest today. We’ll find a cup that suits you from the coffees we have ready.</span></p>
    </div>
    <div className="discovery-options" role="list" aria-label="Coffee preferences">
      {DISCOVERY_TAGS.map((tag, index) => <button key={tag.value} type="button" className={selected === tag.value ? "is-selected" : ""} aria-pressed={selected === tag.value} onClick={() => choose(tag.value)} style={{ "--option-index": index } as React.CSSProperties}>
        <span className="discovery-option-number">0{index + 1}</span><span><strong className="lang-ko">{tag.ko}</strong><strong className="lang-en">{tag.en}</strong><small>{tag.en}</small></span><i aria-hidden="true">↗</i>
      </button>)}
    </div>

    <div ref={resultRef} className={`discovery-result ${selected ? "is-visible" : ""}`} aria-live="polite">
      {!products.length ? <div className="discovery-empty"><p className="section-label">Next batch</p><h3><span className="lang-ko">새로운 커피를 준비하고 있어요.</span><span className="lang-en">The next coffees are resting.</span></h3><p><span className="lang-ko">로스팅이 끝나는 대로 이곳에 소개할게요.</span><span className="lang-en">We’ll introduce them here as soon as they’re ready.</span></p></div> : primary && intent ? <>
        <ProductImage key={`image-${selected}-${primary.id}`} product={primary} />
        <div key={`copy-${selected}-${primary.id}`} className="discovery-product-copy">
          <p className="section-label"><span className="lang-ko">오늘의 추천</span><span className="lang-en">Casa&apos;s pick</span></p>
          <h3>{primary.name}</h3>
          <p className="discovery-reason"><span className="lang-ko">{primary.description || intent.reasonKo}</span><span className="lang-en">{intent.reasonEn}</span></p>
          {primary.tasting_notes && <div className="discovery-notes"><span>Tasting notes</span><p>{primary.tasting_notes}</p></div>}
          <ProductPurchase product={primary} compact />
          <Link href={`/shop/${primary.slug}`} className="discovery-detail-link"><span className="lang-ko">커피 자세히 보기</span><span className="lang-en">See coffee details</span><ArrowRight size={14} /></Link>
        </div>
      </> : <div className="discovery-prompt"><span aria-hidden="true">↑</span><p><span className="lang-ko">지금 마시고 싶은 느낌을 하나 골라보세요.</span><span className="lang-en">Choose what you feel like drinking.</span></p></div>}
    </div>
    {recommendations.length > 1 && selected && <div key={`alternatives-${selected}`} className="discovery-alternatives"><p className="section-label"><span className="lang-ko">비슷한 성향의 다른 선택</span><span className="lang-en">Other coffees in this curation</span></p>{recommendations.slice(1, 4).map((product) => <Link href={`/shop/${product.slug}`} key={product.id}><span>{product.name}</span><small>{product.tasting_notes || product.origin}</small><ArrowRight size={15} /></Link>)}</div>}
  </section>;
}
