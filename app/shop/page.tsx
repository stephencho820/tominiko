import Link from "next/link";
import { ProductCard, formatCoffeeText } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { getProducts } from "@/services/products";
import type { Product } from "@/types";
import { PageText } from "@/components/PageText";
import { getPageSettings } from "@/lib/page-content";

function TodaysRoast({ product }: { product: Product }) {
  const tastingNotes = formatCoffeeText(product.tasting_notes);
  const origins = formatCoffeeText(product.origin);

  return (
    <Reveal className="todays-roast" variant="fade">
      <Link href={`/shop/${product.slug}`} className="todays-roast-link group">
        <div className="todays-roast-image grain">
          {product.image_url ? (
            <img src={product.image_url} alt="" />
          ) : (
            <div className="todays-roast-placeholder" aria-hidden="true">
              <span>Tominiko</span>
              <small>Beans &amp; Coffee</small>
            </div>
          )}
        </div>

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

export default async function Shop() {
  const products = await getProducts({ activeOnly: true });
  const content = await getPageSettings("shop");
  const todaysRoast = products.find((product) => product.todays_roast);
  const otherCoffees = products.filter((product) => !product.todays_roast);

  return (
    <main className="shop-page">
      <header className="shop-intro">
        <p className="section-label">Coffee</p>
        <h1>
          <PageText className="lang-ko" setting={content.texts.title_ko} />
          <PageText className="lang-en" setting={content.texts.title_en} />
        </h1>
        <p className="shop-intro-subtitle">
          <PageText className="lang-ko" setting={content.texts.subtitle_ko} />
          <PageText className="lang-en" setting={content.texts.subtitle_en} />
        </p>
      </header>

      {todaysRoast && <TodaysRoast product={todaysRoast} />}

      {otherCoffees.length > 0 && (
        <section className="coffee-collection" aria-labelledby="coffee-collection-title">
          <div className="coffee-collection-heading">
            <h2 id="coffee-collection-title">
              <PageText className="lang-ko" setting={content.texts.collection_ko} />
              <PageText className="lang-en" setting={content.texts.collection_en} />
            </h2>
            <p>
              <span className="lang-ko">지금 만나볼 수 있는 커피</span>
              <span className="lang-en">Available now</span>
            </p>
          </div>
          <div className="coffee-grid">
            {otherCoffees.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </section>
      )}

      {!products.length && (
        <p className="shop-empty">
          <span className="lang-ko">현재 준비 중입니다. 곧 새로운 커피로 만나요.</span>
          <span className="lang-en">We&apos;re preparing the next roast. New coffees arrive soon.</span>
        </p>
      )}
    </main>
  );
}
