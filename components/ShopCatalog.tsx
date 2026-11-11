"use client";

import Link from "next/link";
import { Grid2X2, List, Rows3, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { defaultProductVariant, productImage, productPrice, productPricing, productVariants, tastingNotes, STANDARD_GRINDS } from "@/lib/products";
import { isShopTag, SHOP_TAGS, type ShopTag } from "@/lib/shop-tags";
import type { Product, Grind } from "@/types";

type View = "grid" | "list" | "large";
function productHoverLabel(product: Product): { label: string; color: string } {
  const source = [product.name, product.korean_name, product.origin, product.region].filter(Boolean).join(" ").toLowerCase();
  if (/decaf|디카페인/.test(source)) {
    return /fruity|프루티|산미/.test(source)
      ? { label: "DECAF · FRUITY", color: "#A66D70" }
      : { label: "DECAF · NUTTY", color: "#777052" };
  }
  if (/tominiko|또미|blend|블렌드/.test(source)) return { label: "TOMINIKO", color: "#80765A" };
  if (/ethiopia|에티오피아|예가체프|시다모/.test(source)) return { label: "ETHIOPIA", color: "#AD795C" };
  if (/kenya|케냐/.test(source)) return { label: "KENYA", color: "#774854" };
  if (/guatemala|과테말라/.test(source)) return { label: "GUATEMALA", color: "#727A60" };
  if (/brazil|브라질/.test(source)) return { label: "BRAZIL", color: "#A77951" };
  if (/colombia|콜롬비아/.test(source)) return { label: "COLOMBIA", color: "#B57762" };
  if (/costa rica|코스타리카/.test(source)) return { label: "COSTA RICA", color: "#738F80" };
  if (/panama|파나마/.test(source)) return { label: "PANAMA", color: "#B5A899" };
  if (/mandheling|만델링|indonesia|인도네시아/.test(source)) return { label: "MANDHELING", color: "#655047" };
  return { label: product.origin?.toUpperCase() || product.name.toUpperCase(), color: "#807362" };
}

function CatalogCard({ product, view }: { product: Product; view: View }) {
  const { addToCart } = useCart();
  const variants = useMemo(() => productVariants(product), [product]);
  const sizes = [...new Set(variants.map((item) => item.size))];
  const [size, setSize] = useState<string>(() => defaultProductVariant(product)?.size ?? "");
  const [grind, setGrind] = useState<Grind>("Whole Bean");
  const variant = variants.find((item) => item.size === size);
  const pricing = productPricing(product, size, variant);
  const regularPrice = pricing.price;
  const salePrice = pricing.salePrice ?? pricing.price;
  const [added, setAdded] = useState(false);
  const [imageRevealed, setImageRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCoffeeBag = product.product_format === "coffee_bag";
  const notes = tastingNotes(product).join(" · ") || (isCoffeeBag ? "커피백 1개 · 분쇄 원두 10g" : "");
  const hover = isCoffeeBag ? { label: "COFFEE BAG", color: "#8D775E" } : productHoverLabel(product);
  const hoverNotes = tastingNotes(product).filter(Boolean).slice(0, 3).join(" · ");
  const primaryImage = productImage(product);
  const conceptImage = product.gallery_images?.[0] && product.gallery_images[0] !== primaryImage ? product.gallery_images[0] : null;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const chooseSize = (nextSize: string) => {
    setSize(nextSize);
  };
  const handleImageClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined" || window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (!imageRevealed) {
      event.preventDefault();
      setImageRevealed(true);
    }
  };
  const addProduct = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!variant) return;
    const didAdd = addToCart({ product, variantId: variant.id, weight: variant.size, grind: product.product_format === "coffee_bag" ? "Filter" : grind, quantity: 1, unitPrice: salePrice });
    if (!didAdd) return;
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1800);
  };
  return <article className={`catalog-card catalog-card--${view}`}>
    <Link href={`/shop/${product.slug}`} className={`catalog-card-image${imageRevealed ? " catalog-card-image--revealed" : ""}${conceptImage ? " catalog-card-image--with-concept" : ""}`} onClick={handleImageClick} onBlur={() => setImageRevealed(false)} aria-label={`${product.name}${hoverNotes ? ` — ${hoverNotes}` : ""} — 상품 상세 보기`}>
      <img className="catalog-primary-photo" src={primaryImage} alt={product.name} />
      {conceptImage && <img className="catalog-concept-photo" src={conceptImage} alt={`${product.name} 콘셉트사진`} loading="lazy" />}
      {!conceptImage && <span className="catalog-image-reveal" style={{ backgroundColor: `${hover.color}B8` }} aria-hidden="true"><span className="catalog-reveal-content"><span className="catalog-reveal-origin">{hover.label}</span>{hoverNotes && <><span className="catalog-reveal-rule" /><span className="catalog-reveal-notes">{hoverNotes}</span></>}</span></span>}
    </Link>
    <div className="catalog-card-copy">
      <p className="catalog-origin">{product.origin}{product.region ? ` · ${product.region}` : ""}</p>
      <Link href={`/shop/${product.slug}`}><h2>{product.korean_name || product.name}</h2></Link>
      {product.korean_name && <p className="catalog-english">{product.name}</p>}
      {notes && <p className="catalog-notes">{notes}</p>}
      {Boolean(product.review_count) && <Link href={`/shop/${product.slug}#reviews`} className="product-rating product-rating-link" aria-label={`${product.name} 리뷰 ${product.review_count}개 보기`}>★★★★★ <b>{product.review_average?.toFixed(1)}</b> ({product.review_count})</Link>}
      {view === "list" && product.short_description && <p className="catalog-description">{product.short_description}</p>}
      <div className={`catalog-options${isCoffeeBag ? " catalog-options--coffee-bag" : ""}`} aria-label={`${product.name} options`}>
        <select aria-label={isCoffeeBag ? "커피백 구성" : "Size"} value={size} onChange={(event) => chooseSize(event.target.value)}>{sizes.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        {isCoffeeBag
          ? <span className="catalog-bag-info" aria-label="커피백 이용 안내">분쇄 선택 없이 간편하게</span>
          : <select aria-label="Grind" value={grind} onChange={(event) => setGrind(event.target.value as Grind)}>{STANDARD_GRINDS.map((value) => <option key={value} value={value}>{value}</option>)}</select>}
      </div>
      <div className="catalog-buy"><strong className="catalog-price">{salePrice < regularPrice && <del>₩{regularPrice.toLocaleString("ko-KR")}</del>}<span>₩{salePrice.toLocaleString("ko-KR")}</span></strong>
        <button type="button" onClick={addProduct} disabled={!variant?.available || variant.stock < 1} aria-live="polite" className={added ? "cart-added" : ""}><ShoppingBag size={15} />{variant?.available && variant.stock > 0 ? added ? "✓ 담았어요" : "장바구니 추가" : "SOLD OUT"}</button>
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
  const availableCategories = useMemo(() => {
    const counts = new Map<ShopTag, number>();
    for (const tag of SHOP_TAGS) counts.set(tag, 0);
    for (const product of products) {
      for (const tag of product.discovery_tags ?? []) {
        if (isShopTag(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [
      { value: "all" as const, label: "All", count: products.length },
      ...SHOP_TAGS.filter((tag) => (counts.get(tag) ?? 0) > 0 || category === tag).map((tag) => ({ value: tag, label: tag, count: counts.get(tag) ?? 0 })),
    ];
  }, [category, products]);
  const shown = useMemo(() => products.filter((product) => category === "all" || (product.discovery_tags ?? []).includes(category)).sort((a, b) => {
    if (sort === "new") return String(b.created_at).localeCompare(String(a.created_at));
    if (sort === "low") return productPrice(a) - productPrice(b);
    if (sort === "high") return productPrice(b) - productPrice(a);
    return a.display_order - b.display_order;
  }), [category, products, sort]);
  return <section className="shop-catalog" aria-label="Coffee catalog">
    <div className="catalog-toolbar">
      <div className="category-tabs">{availableCategories.map((item) => <button type="button" key={item.value} aria-pressed={category === item.value} onClick={() => selectCategory(item.value)}>{item.label}<small>{item.count}</small></button>)}<Link href="/subscription" className="catalog-subscription-tab">구독</Link></div>
      <div className="catalog-controls"><span className="catalog-count">{shown.length} COFFEE{shown.length === 1 ? "" : "S"}</span><select aria-label="상품 정렬" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">추천순</option><option value="new">신상품순</option><option value="low">가격 낮은순</option><option value="high">가격 높은순</option></select>
        <div className="view-controls" aria-label="보기 방식">{([["grid", Grid2X2], ["list", List], ["large", Rows3]] as const).map(([value, Icon]) => <button title={value} aria-label={`${value} view`} aria-pressed={view === value} type="button" key={value} onClick={() => setView(value)}><Icon size={17} /></button>)}</div>
      </div>
    </div>
    <div className={`catalog-products catalog-products--${view}`}>{shown.map((product) => <CatalogCard key={product.id} product={product} view={view} />)}</div>
    {!shown.length && <p className="shop-empty">현재 이 카테고리에 준비된 커피가 없습니다.</p>}
  </section>;
}
