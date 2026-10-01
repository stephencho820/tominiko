import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductPurchase } from "@/components/ProductPurchase";
import { ProductCard } from "@/components/ProductCard";
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
export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const slug = (await params).slug; const preview = (await searchParams).preview === "1";
  const [product, all] = await Promise.all([getProduct(slug, { includeInactive: preview }), getProducts({ activeOnly: true })]);
  if (!product) notFound();
  const reviewData = await getProductReviews(product.id);
  const notes = tastingNotes(product); const images = [productImage(product), ...(product.gallery_images ?? [])].filter((value, index, list) => list.indexOf(value) === index);
  const related = all.filter((item) => item.id !== product.id).sort((a,b) => Number(b.category === product.category)-Number(a.category === product.category)).slice(0,3);
  const brew = product.use_default_recipe ? { brewing_dose:"20g", brewing_water:"300g", brewing_temperature:"92°C", brewing_grind:"Medium", brewing_time:"2:30–3:00" } : product;
  return <main className="product-detail product-detail-new">
    {preview && <div className="preview-banner">ADMIN PREVIEW · <Link href={`/admin/products/${product.id}`}>Back to editor</Link></div>}
    <section className="product-hero"><div className="product-gallery">{images.map((image, index) => <img src={image} alt={`${product.name}${index ? ` ${index+1}`:""}`} key={image} />)}</div><div className="product-intro"><p className="section-label">{product.origin}{product.region ? ` · ${product.region}`:""}</p><h1>{product.korean_name || product.name}</h1>{product.korean_name && <p className="product-english-name">{product.name}</p>}{product.subtitle && <p className="product-subtitle">{product.subtitle}</p>}<ProductPurchase product={product}/></div></section>
    <div className="pdp-sections">
      {(notes.length > 0 || product.acidity || product.sweetness || product.body) && <section><p className="section-label">TASTES LIKE</p>{notes.length > 0 && <h2>{notes.join(" · ")}</h2>}<div className="taste-profile"><Profile label="ACIDITY" value={product.acidity}/><Profile label="SWEETNESS" value={product.sweetness}/><Profile label="BODY" value={product.body}/></div></section>}
      <section><p className="section-label">THE COFFEE</p><Facts rows={[["Country",product.origin],["Region",product.region],["Farm / Producer",product.producer],["Washing station",product.washing_station],["Variety",product.variety],["Process",product.process],["Altitude",product.altitude],["Harvest",product.harvest],["Grade",product.grade]]}/></section>
      {(product.about || product.why_we_chose_it || product.description) && <section><p className="section-label">OUR NOTE</p><h2>About this coffee</h2><p>{product.about || product.description}</p>{product.why_we_chose_it && <><h3>Why we chose it</h3><p>{product.why_we_chose_it}</p></>}</section>}
      {product.roaster_note && <section><p className="section-label">ROASTER&apos;S NOTE</p><p>{product.roaster_note}</p></section>}
      {(product.use_default_recipe || product.brewing_dose || product.brewing_water || product.brewing_temperature || product.brewing_grind || product.brewing_time) && <section><p className="section-label">BREWING GUIDE</p><Facts rows={[["Coffee",brew.brewing_dose],["Water",brew.brewing_water],["Temperature",brew.brewing_temperature],["Grind",brew.brewing_grind],["Brew time",brew.brewing_time]]}/></section>}
    </div>
    <ProductReviews productId={product.id} initialReviews={reviewData.reviews} stats={reviewData.stats} allowGuests={reviewData.allowGuests} user={reviewData.user}/>
    {related.length > 0 && <section className="related-products"><p className="section-label">YOU MAY ALSO LIKE</p><div>{related.map((item) => <ProductCard product={item} key={item.id}/>)}</div></section>}
  </main>;
}
