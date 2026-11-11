import type { Metadata } from "next";
import "./product-editorial.css";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductPurchase } from "@/components/ProductPurchase";
import { CoffeeBagCrossSell } from "@/components/CoffeeBagCrossSell";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { productImage, tastingNotes } from "@/lib/products";
import { getProduct, getProducts } from "@/services/products";
import { getProductReviews } from "@/services/reviews";
import { ProductReviews } from "@/components/ProductReviews";

function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const visible = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (!visible.length) return null;
  return <dl className="product-facts-list">{visible.map(([label, value]) => <div className="product-fact" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
function Profile({ label, value }: { label: string; value?: number | null }) { if (!value) return null; return <div className="taste-meter"><span>{label}</span><span aria-label={`${value} out of 5`}>{"●".repeat(value)}<i>{"●".repeat(5-value)}</i></span></div>; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const product = await getProduct(slug);
  if (!product) return { title: "Coffee" };
  const image = productImage(product);
  const description = product.short_description || product.description || [product.tasting_notes, product.origin, product.process].filter(Boolean).join(" · ");
  return {
    title: product.korean_name || product.name,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.korean_name || product.name,
      description,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
  };
}
export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const slug = (await params).slug; const preview = (await searchParams).preview === "1";
  const [product, all] = await Promise.all([getProduct(slug, { includeInactive: preview }), getProducts({ activeOnly: true })]);
  if (!product) notFound();
  const reviewData = await getProductReviews(product.id);
  const notes = tastingNotes(product);
  const coffeeBag = product.product_format === "beans"
    ? all.find((item) => item.product_format === "coffee_bag" && item.status === "active" && item.variants?.some((variant) => variant.available && variant.stock > 0))
    : undefined;
  const displayTitle = product.korean_name || product.name;
  const hasMixedScriptTitle = /[A-Za-z]/.test(displayTitle) && /[가-힣]/.test(displayTitle);
  const images = [productImage(product), ...(product.gallery_images ?? [])].filter((value, index, list) => list.indexOf(value) === index);
  const displayTags = (product.discovery_tags ?? []).filter(Boolean);
  const roastedDate = product.roasted_date ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(`${product.roasted_date}T00:00:00+09:00`)) : null;
  const productTags = new Set(product.discovery_tags ?? []);
  const related = all
    .filter((item) => item.id !== product.id)
    .sort((a, b) => {
      const overlapA = (a.discovery_tags ?? []).filter((tag) => productTags.has(tag)).length;
      const overlapB = (b.discovery_tags ?? []).filter((tag) => productTags.has(tag)).length;
      if (overlapA !== overlapB) return overlapB - overlapA;
      if (a.product_type !== b.product_type) {
        if (a.product_type === product.product_type) return -1;
        if (b.product_type === product.product_type) return 1;
      }
      return a.display_order - b.display_order;
    })
    .slice(0, 3);
  const brew = product.product_format === "coffee_bag" ? {
    brewing_dose: product.brewing_dose || "커피백 1개",
    brewing_water: product.brewing_water || "160–180ml",
    brewing_temperature: product.brewing_temperature || "92–94°C",
    brewing_grind: "분쇄 불필요",
    brewing_time: product.brewing_time || "3–4분",
  } : product.use_default_recipe ? { brewing_dose:"20g", brewing_water:"300g", brewing_temperature:"92°C", brewing_grind:"Medium", brewing_time:"2:30–3:00" } : product;
  return <main className="product-detail product-detail-new">
    {preview && <div className="preview-banner">ADMIN PREVIEW · <Link href={`/admin/products/${product.id}`}>Back to editor</Link></div>}
    <div className="pdp-topline"><Link href="/shop">← BACK TO SHOP</Link><span>CASA DI STEFANO / COFFEE COLLECTION</span></div>
    <section className="product-hero">
      <ProductGallery images={images} productName={product.name} />
      <div className="product-intro"><div className="pdp-intro-inner">
        <p className="section-label pdp-origin-label">COFFEE COLLECTION / {product.origin}{product.region ? ` · ${product.region}`:""}</p>
        <h1 className={hasMixedScriptTitle ? "pdp-title--mixed" : undefined}>{displayTitle}</h1>
        {product.korean_name && <p className="product-english-name">{product.name}</p>}
        {product.subtitle && <p className="product-subtitle">{product.subtitle}</p>}
        {notes.length > 0 && <div className="pdp-tasting"><span>IN THE CUP</span><p className="product-tasting-lead">{notes.join(" · ")}</p></div>}
        <div className="product-hero-meta">
          {displayTags.length > 0 && <div className="product-tag-list">{displayTags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
          <div className="product-freshness">
            {roastedDate && <span>ROASTED {roastedDate}</span>}
            <a href="#reviews" className="product-review-jump" aria-label={`리뷰 ${reviewData.stats.count}개 보기`}>★ {reviewData.stats.count > 0 ? `${reviewData.stats.average.toFixed(1)} · 리뷰 ${reviewData.stats.count}개` : "리뷰 보기 · 첫 리뷰 남기기"} <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        {(product.acidity || product.sweetness || product.body) && <div className="taste-profile taste-profile-hero"><Profile label="ACIDITY" value={product.acidity}/><Profile label="SWEETNESS" value={product.sweetness}/><Profile label="BODY" value={product.body}/></div>}
        <ProductPurchase product={product}/>
        {coffeeBag && <CoffeeBagCrossSell product={coffeeBag}/>}
      </div></div>
    </section>
    <div className="pdp-editorial">
      {(product.about || product.description || product.why_we_chose_it || product.roaster_note) && <section className="pdp-narrative" aria-labelledby="pdp-story-title">
        <div className="pdp-editorial-index"><span>01 / THE STORY</span><span>CASA DI STEFANO</span></div>
        <div className="pdp-narrative-grid">
          <div className="pdp-narrative-title"><span className="pdp-kicker">OUR COFFEE, OUR POINT OF VIEW</span><h2 id="pdp-story-title">좋은 커피는<br/>매일의 순간에<br/>스며듭니다.</h2></div>
          <div className="pdp-narrative-copy">
            {(product.about || product.description) && <p className="pdp-story-lead">{product.about || product.description}</p>}
            {product.why_we_chose_it && <p>{product.why_we_chose_it}</p>}
            {product.roaster_note && <div className="pdp-roaster-aside"><span>FROM THE ROASTER</span><p>{product.roaster_note}</p></div>}
          </div>
        </div>
      </section>}
      <section className="pdp-profile-block" aria-labelledby="pdp-profile-title">
        <div className="pdp-editorial-index"><span>02 / THE PROFILE</span><span>COFFEE DETAILS</span></div>
        <div className="pdp-profile-heading"><span className="pdp-kicker">KNOW YOUR COFFEE</span><h2 id="pdp-profile-title">원두의 기본 정보</h2></div>
        <div className="pdp-profile-grid">
          {([["원산지",product.origin],["지역",product.region],["가공 방식",product.process],["품종",product.variety],["등급",product.grade],["생산자",product.producer],["워싱 스테이션",product.washing_station],["고도",product.altitude],["수확",product.harvest],["로스팅",roastedDate]] as [string,string | null | undefined][]).filter(([,value])=>Boolean(value)).map(([label,value])=><div className="pdp-profile-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>
      {(product.use_default_recipe || product.brewing_dose || product.brewing_water || product.brewing_temperature || product.brewing_grind || product.brewing_time) && <section className="pdp-brew-block" aria-labelledby="pdp-brew-title">
        <div className="pdp-editorial-index"><span>03 / BREWING RITUAL</span><span>OUR RECOMMENDATION</span></div>
        <div className="pdp-brew-layout"><div><span className="pdp-kicker">A BETTER DAILY RITUAL</span><h2 id="pdp-brew-title">한 잔을 위한<br/>작은 레시피.</h2><p>가장 편안한 균형을 찾기 위한 추천 추출 가이드입니다.</p></div>
        <div className="pdp-brew-grid">{([["원두",brew.brewing_dose],["물",brew.brewing_water],["온도",brew.brewing_temperature],["분쇄도",brew.brewing_grind],["추출 시간",brew.brewing_time]] as [string,string | null | undefined][]).filter(([,value])=>Boolean(value)).map(([label,value])=><div className="pdp-brew-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div>
      </section>}
    </div>
    <ProductReviews productId={product.id} initialReviews={reviewData.reviews} stats={reviewData.stats} allowGuests={reviewData.allowGuests} user={reviewData.user}/>
    {related.length > 0 && <section className="related-products"><p className="section-label">YOU MAY ALSO LIKE</p><div>{related.map((item) => <ProductCard product={item} key={item.id}/>)}</div></section>}
  </main>;
}
