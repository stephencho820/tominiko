import Link from "next/link";
import type { Product } from "@/types";
import { defaultProductVariant, productImage, productPricing } from "@/lib/products";

export function formatCoffeeText(value: string | null, fallback = "") {
  return value?.replace(/\s*[,/]\s*/g, " · ") ?? fallback;
}

export function ProductCard({ product }: { product: Product }) {
  const mainImage = productImage(product);
  const conceptImage = product.gallery_images?.[0] && product.gallery_images[0] !== mainImage ? product.gallery_images[0] : null;
  const tastingNotes = formatCoffeeText(product.tasting_notes)
    || (product.product_format === "coffee_bag" ? "커피백 1개 · 분쇄 원두 10g" : "");
  const coffeeDetails = [formatCoffeeText(product.origin), product.process]
    .filter(Boolean)
    .join(" · ");
  const variant = defaultProductVariant(product, "150g");
  const pricing = productPricing(product, variant?.size ?? "150g", variant);
  const regularPrice = pricing.price;
  const salePrice = pricing.salePrice ?? pricing.price;

  return (
    <article className="product-card">
      <div className="product-card-link group">
        <Link href={`/shop/${product.slug}`} className="product-card-image grain" aria-label={`${product.name} 상세 보기`}>
          <img src={mainImage} alt={product.name} loading="lazy" />
          {conceptImage && <img className="product-card-concept-photo" src={conceptImage} alt={`${product.name} 콘셉트사진`} loading="lazy" />}
        </Link>

        <div className="product-card-copy">
          <div>
            <h3><Link href={`/shop/${product.slug}`}>{product.korean_name || product.name}</Link></h3>
            {tastingNotes && <p className="product-card-notes">{tastingNotes}</p>}
            <p className="product-card-origin">{coffeeDetails}</p>
            {Boolean(product.review_count) && <Link href={`/shop/${product.slug}#reviews`} className="product-rating product-rating-link" aria-label={`${product.name} 리뷰 ${product.review_count}개 보기`}>★★★★★ <b>{product.review_average?.toFixed(1)}</b> ({product.review_count})</Link>}
          </div>
          <p className="product-card-price">
            {salePrice < regularPrice && <del>₩{regularPrice.toLocaleString()}</del>}
            <span>₩{salePrice.toLocaleString()}</span>
            <small>/ {variant?.size ?? "150g"}</small>
          </p>
        </div>
      </div>
    </article>
  );
}
