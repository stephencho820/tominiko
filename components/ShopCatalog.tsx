"use client";

import Link from "next/link";
import { Grid2X2, List, Rows3, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import { productImage, productPrice, productVariants, tastingNotes } from "@/lib/products";
import type { Product, ProductCategory } from "@/types";

type View = "grid" | "list" | "large";
const categories: { value: "all" | ProductCategory; label: string }[] = [
  { value: "all", label: "All" }, { value: "comfortable", label: "고소하고 편안한" },
  { value: "bright", label: "화사하고 산뜻한" }, { value: "decaf", label: "디카페인" },
  { value: "blend", label: "Blend" }, { value: "special", label: "특별한 날" },
];

function categoryOf(product: Product): ProductCategory {
  if (product.category) return product.category;
  if (product.product_type === "decaf") return "decaf";
  if (product.product_type === "blend") return "blend";
  if (product.discovery_tags?.includes("bright-fruity")) return "bright";
  if (product.discovery_tags?.includes("something-special")) return "special";
  return "comfortable";
}

function CatalogCard({ product, view }: { product: Product; view: View }) {
  const { add } = useCart();
  const variant = productVariants(product)[0];
  const notes = tastingNotes(product).join(" · ");
  const addProduct = () => variant && add({ product, variantId: variant.id, weight: variant.size, grind: variant.grindType, quantity: 1, unitPrice: variant.salePrice ?? variant.price });
  return <article className={`catalog-card catalog-card--${view}`}>
    <Link href={`/shop/${product.slug}`} className="catalog-card-image"><img src={productImage(product)} alt={product.name} /></Link>
    <div className="catalog-card-copy">
      <p className="catalog-origin">{product.origin}{product.region ? ` · ${product.region}` : ""}</p>
      <Link href={`/shop/${product.slug}`}><h2>{product.korean_name || product.name}</h2></Link>
      {product.korean_name && <p className="catalog-english">{product.name}</p>}
      {notes && <p className="catalog-notes">{notes}</p>}
      {view === "list" && product.short_description && <p className="catalog-description">{product.short_description}</p>}
      <div className="catalog-buy"><strong>₩{productPrice(product).toLocaleString("ko-KR")}</strong>
        <button type="button" onClick={addProduct} disabled={!variant}><ShoppingBag size={14} />{variant ? "ADD TO CART" : "SOLD OUT"}</button>
      </div>
    </div>
  </article>;
}

export function ShopCatalog({ products }: { products: Product[] }) {
  const [view, setView] = useState<View>("grid");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [sort, setSort] = useState("featured");
  const shown = useMemo(() => products.filter((product) => category === "all" || categoryOf(product) === category).sort((a, b) => {
    if (sort === "new") return String(b.created_at).localeCompare(String(a.created_at));
    if (sort === "low") return productPrice(a) - productPrice(b);
    if (sort === "high") return productPrice(b) - productPrice(a);
    return a.display_order - b.display_order;
  }), [category, products, sort]);
  return <section className="shop-catalog" aria-label="Coffee catalog">
    <div className="catalog-toolbar">
      <div className="category-tabs">{categories.map((item) => <button type="button" key={item.value} aria-pressed={category === item.value} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div>
      <div className="catalog-controls"><select aria-label="상품 정렬" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">추천순</option><option value="new">신상품순</option><option value="low">가격 낮은순</option><option value="high">가격 높은순</option></select>
        <div className="view-controls" aria-label="보기 방식">{([["grid", Grid2X2], ["list", List], ["large", Rows3]] as const).map(([value, Icon]) => <button title={value} aria-label={`${value} view`} aria-pressed={view === value} type="button" key={value} onClick={() => setView(value)}><Icon size={17} /></button>)}</div>
      </div>
    </div>
    <div className={`catalog-products catalog-products--${view}`}>{shown.map((product) => <CatalogCard key={product.id} product={product} view={view} />)}</div>
    {!shown.length && <p className="shop-empty">이 카테고리의 커피를 준비하고 있습니다.</p>}
  </section>;
}
