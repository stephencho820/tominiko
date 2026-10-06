"use client";

import Link from "next/link";
import { Grid2X2, List, Rows3, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { productImage, productPrice, productPricing, productVariants, tastingNotes } from "@/lib/products";
import { isShopTag, SHOP_TAGS, type ShopTag } from "@/lib/shop-tags";
import type { Product } from "@/types";

type View = "grid" | "list" | "large";
const categories: { value: "all" | ShopTag; label: string }[] = [
  { value: "all", label: "All" },
  ...SHOP_TAGS.map((tag) => ({ value: tag, label: tag })),
];

function CatalogCard({ product, view }: { product: Product; view: View }) {
  const { addToCart } = useCart();
  const variants = useMemo(() => productVariants(product), [product]);
  const sizes = [...new Set(variants.map((item) => item.size))];
  const [size, setSize] = useState(() => sizes.includes("150g") ? "150g" : sizes[0] ?? "");
  const grinds = variants.filter((item) => item.size === size);
  const [variantId, setVariantId] = useState(() => grinds.find((item) => item.grindType === "Whole Bean")?.id ?? grinds[0]?.id ?? "");
  const variant = grinds.find((item) => item.id === variantId) ?? grinds[0];
  const pricing = productPricing(product, size, variant);
  const regularPrice = pricing.price;
  const salePrice = pricing.salePrice ?? pricing.price;
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notes = tastingNotes(product).join(" · ");
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const chooseSize = (nextSize: string) => {
    const nextGrinds = variants.filter((item) => item.size === nextSize);
    setSize(nextSize);
    setVariantId(nextGrinds.find((item) => item.grindType === "Whole Bean")?.id ?? nextGrinds[0]?.id ?? "");
  };
  const addProduct = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!variant) return;
    const didAdd = addToCart({ product, variantId: variant.id, weight: variant.size, grind: variant.grindType, quantity: 1, unitPrice: salePrice });
    if (!didAdd) return;
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1800);
  };
  return <article className={`catalog-card catalog-card--${view}`}>
    <Link href={`/shop/${product.slug}`} className="catalog-card-image"><img src={productImage(product)} alt={product.name} /></Link>
    <div className="catalog-card-copy">
      <p className="catalog-origin">{product.origin}{product.region ? ` · ${product.region}` : ""}</p>
      <Link href={`/shop/${product.slug}`}><h2>{product.korean_name || product.name}</h2></Link>
      {product.korean_name && <p className="catalog-english">{product.name}</p>}
      {notes && <p className="catalog-notes">{notes}</p>}
      {Boolean(product.review_count) && <p className="product-rating">★★★★★ <b>{product.review_average?.toFixed(1)}</b> ({product.review_count})</p>}
      {view === "list" && product.short_description && <p className="catalog-description">{product.short_description}</p>}
      <div className="catalog-options" aria-label={`${product.name} options`}>
        <select aria-label="Size" value={size} onChange={(event) => chooseSize(event.target.value)}>{sizes.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Grind" value={variant?.id ?? ""} onChange={(event) => setVariantId(event.target.value)}>{grinds.map((item) => <option key={item.id} value={item.id} disabled={!item.available || item.stock < 1}>{item.grindType}{item.stock < 1 ? " · Sold out" : ""}</option>)}</select>
      </div>
      <div className="catalog-buy"><strong className="catalog-price">{salePrice < regularPrice && <del>₩{regularPrice.toLocaleString("ko-KR")}</del>}<span>₩{salePrice.toLocaleString("ko-KR")}</span></strong>
        <button type="button" onClick={addProduct} disabled={!variant?.available || variant.stock < 1} aria-live="polite"><ShoppingBag size={14} />{variant?.available && variant.stock > 0 ? added ? "ADDED" : "ADD TO CART" : "SOLD OUT"}</button>
      </div>
    </div>
  </article>;
}

export function ShopCatalog({ products }: { products: Product[] }) {
  const [view, setView] = useState<View>("list");
  const [category, setCategory] = useState<"all" | ShopTag>("all");
  const [sort, setSort] = useState("featured");
  useEffect(() => { if (!window.matchMedia("(max-width: 700px)").matches) setView("grid"); }, []);
  useEffect(() => {
    const syncFromUrl = () => {
      const tag = new URLSearchParams(window.location.search).get("tag");
      setCategory(isShopTag(tag) ? tag : "all");
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  const selectCategory = (value: "all" | ShopTag) => {
    setCategory(value);
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("tag");
    else url.searchParams.set("tag", value);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const shown = useMemo(() => products.filter((product) => category === "all" || (product.discovery_tags ?? []).includes(category)).sort((a, b) => {
    if (sort === "new") return String(b.created_at).localeCompare(String(a.created_at));
    if (sort === "low") return productPrice(a) - productPrice(b);
    if (sort === "high") return productPrice(b) - productPrice(a);
    return a.display_order - b.display_order;
  }), [category, products, sort]);
  return <section className="shop-catalog" aria-label="Coffee catalog">
    <div className="catalog-toolbar">
      <div className="category-tabs">{categories.map((item) => <button type="button" key={item.value} aria-pressed={category === item.value} onClick={() => selectCategory(item.value)}>{item.label}</button>)}</div>
      <div className="catalog-controls"><select aria-label="상품 정렬" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">추천순</option><option value="new">신상품순</option><option value="low">가격 낮은순</option><option value="high">가격 높은순</option></select>
        <div className="view-controls" aria-label="보기 방식">{([["grid", Grid2X2], ["list", List], ["large", Rows3]] as const).map(([value, Icon]) => <button title={value} aria-label={`${value} view`} aria-pressed={view === value} type="button" key={value} onClick={() => setView(value)}><Icon size={17} /></button>)}</div>
      </div>
    </div>
    <div className={`catalog-products catalog-products--${view}`}>{shown.map((product) => <CatalogCard key={product.id} product={product} view={view} />)}</div>
    {!shown.length && <p className="shop-empty">현재 이 카테고리에 준비된 커피가 없습니다.</p>}
  </section>;
}
