import Link from "next/link";
import type { Product } from "@/types";
import { defaultProductVariant, productImage, productPricing } from "@/lib/products";

export function formatCoffeeText(value: string | null, fallback = "") {
  return value?.replace(/\s*[,/]\s*/g, " · ") ?? fallback;
}

export function ProductCard({ product }: { product: Product }) {
  const tastingNotes = formatCoffeeText(product.tasting_notes);
  const coffeeDetails = [formatCoffeeText(product.origin), product.process]
    .filter(Boolean)
    .join(" · ");
  const variant = defaultProductVariant(product, "150g");
  const pricing = productPricing(product, variant?.size ?? "150g", variant);
  const regularPrice = pricing.price;
  const salePrice = pricing.salePrice ?? pricing.price;

  return (
    <article className="product-card">
      <Link
        href={`/shop/${product.slug}`}
        className="product-card-link group"
        aria-label={`${product.name}, ₩${salePrice.toLocaleString()}, ${variant?.size ?? "150g"}`}
      >
        <div className="product-card-image grain">
          <img src={productImage(product)} alt={product.name} loading="lazy" />
        </div>

        <div className="product-card-copy">
          <div>
            <h3>{product.korean_name || product.name}</h3>
            {tastingNotes && <p className="product-card-notes">{tastingNotes}</p>}
            <p className="product-card-origin">{coffeeDetails}</p>
            {Boolean(product.review_count) && <p className="product-rating">★★★★★ <b>{product.review_average?.toFixed(1)}</b> ({product.review_count})</p>}
          </div>
          <p className="product-card-price">
            {salePrice < regularPrice && <del>₩{regularPrice.toLocaleString()}</del>}
            <span>₩{salePrice.toLocaleString()}</span>
            <small>/ {variant?.size ?? "150g"}</small>
          </p>
        </div>
      </Link>
    </article>
  );
}
