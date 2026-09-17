import Link from "next/link";
import type { Product } from "@/types";

export function formatCoffeeText(value: string | null, fallback = "") {
  return value?.replace(/\s*[,/]\s*/g, " · ") ?? fallback;
}

export function ProductCard({ product }: { product: Product }) {
  const tastingNotes = formatCoffeeText(product.tasting_notes);
  const coffeeDetails = [formatCoffeeText(product.origin), product.process]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="product-card">
      <Link
        href={`/shop/${product.slug}`}
        className="product-card-link group"
        aria-label={`${product.name}, ₩${product.price_150g.toLocaleString()}`}
      >
        <div className="product-card-image grain">
          {product.image_url ? (
            <img src={product.image_url} alt="" loading="lazy" />
          ) : (
            <div className="product-card-placeholder" aria-hidden="true">
              <span>Tominiko</span>
              <small>{product.origin}</small>
            </div>
          )}
        </div>

        <div className="product-card-copy">
          <div>
            <h3>{product.name}</h3>
            {tastingNotes && <p className="product-card-notes">{tastingNotes}</p>}
            <p className="product-card-origin">{coffeeDetails}</p>
          </div>
          <p className="product-card-price">
            <span>₩{product.price_150g.toLocaleString()}</span>
            <small>/ 150g</small>
          </p>
        </div>
      </Link>
    </article>
  );
}
