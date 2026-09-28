import Link from "next/link";
import type { Product } from "@/types";
import { productImage } from "@/lib/products";

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
          <img src={productImage(product)} alt={product.name} loading="lazy" />
        </div>

        <div className="product-card-copy">
          <div>
            <h3>{product.korean_name || product.name}</h3>
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
