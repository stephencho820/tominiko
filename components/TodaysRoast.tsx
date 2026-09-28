import Link from "next/link";
import { formatCoffeeText } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { RoastImage } from "@/components/RoastImage";
import type { Product } from "@/types";

export function TodaysRoast({ product }: { product: Product }) {
  const tastingNotes = formatCoffeeText(product.tasting_notes);
  const origins = formatCoffeeText(product.origin);

  return (
    <Reveal className="todays-roast" variant="fade">
      <Link
        href={`/shop/${product.slug}`}
        className={`todays-roast-link group${product.image_url ? "" : " todays-roast-link--no-image"}`}
      >
        {product.image_url && <RoastImage src={product.image_url} alt={product.name} />}

        <div className="todays-roast-copy">
          <p className="section-label">Today&apos;s roast</p>
          <h2>{product.name}</h2>
          {tastingNotes && <p className="todays-roast-notes">{tastingNotes}</p>}
          <p className="todays-roast-origin">
            {origins}{product.process ? ` · ${product.process}` : ""}
          </p>
          <p className="todays-roast-price">
            ₩{product.price_150g.toLocaleString()} <span>/ 150g</span>
          </p>
          <span className="todays-roast-cta">
            <span className="lang-ko">커피 보기</span>
            <span className="lang-en">View coffee</span>
            <i aria-hidden="true">→</i>
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
