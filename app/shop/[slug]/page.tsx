import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/ProductPurchase";
import { getProduct } from "@/services/products";

function ProductFact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="product-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const coffeeFacts = [product.origin, product.region, product.producer, product.variety, product.process].filter(Boolean);
  const roastFacts = [product.roast_level, product.roasted_date].filter(Boolean);

  return (
    <main className="product-detail">
      <section className="product-hero" aria-labelledby="product-title">
        <div className="product-visual grain">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="product-image" />
          ) : (
            <div className="product-image-fallback">
              <span className="section-label">Coffee / {product.origin}</span>
              <span>Casa</span>
            </div>
          )}
          <span className="product-availability">
            {product.stock_quantity > 0 ? (
              <><span className="lang-ko">스몰 배치 · 판매 중</span><span className="lang-en">Small batch · Available</span></>
            ) : (
              <><span className="lang-ko">품절</span><span className="lang-en">Sold out</span></>
            )}
          </span>
        </div>

        <div className="product-intro">
          <p className="section-label">Tominiko Beans &amp; Coffee</p>
          <h1 id="product-title">{product.name}</h1>
          {product.tasting_notes && <p className="product-notes">{product.tasting_notes}</p>}
          {product.description && <p className="product-lede">{product.description}</p>}
          <ProductPurchase product={product} />
        </div>
      </section>

      {(product.description || product.tasting_notes || coffeeFacts.length > 0 || roastFacts.length > 0) && (
        <div className="product-story">
          {(product.description || product.tasting_notes) && (
            <section className="story-cup" aria-labelledby="the-cup">
              <p className="section-label">01 / The cup</p>
              <h2 id="the-cup">
                <span className="lang-ko">잔 안에서 만나는 맛</span>
                <span className="lang-en">In the cup</span>
              </h2>
              {product.tasting_notes && <p className="story-notes">{product.tasting_notes}</p>}
              {product.description && <p className="story-copy">{product.description}</p>}
            </section>
          )}

          {coffeeFacts.length > 0 && (
            <section className="story-facts" aria-labelledby="the-coffee">
              <div className="story-heading">
                <p className="section-label">02 / The coffee</p>
                <h2 id="the-coffee">
                  <span className="lang-ko">커피가 온 곳</span>
                  <span className="lang-en">Where it begins</span>
                </h2>
              </div>
              <dl className="product-facts-list">
                <ProductFact label="Origin" value={product.origin} />
                <ProductFact label="Region" value={product.region} />
                <ProductFact label="Producer" value={product.producer} />
                <ProductFact label="Variety" value={product.variety} />
                <ProductFact label="Process" value={product.process} />
              </dl>
            </section>
          )}

          {roastFacts.length > 0 && (
            <section className="story-facts story-roast" aria-labelledby="the-roast">
              <div className="story-heading">
                <p className="section-label">03 / The roast</p>
                <h2 id="the-roast">
                  <span className="lang-ko">작은 배치로 로스팅</span>
                  <span className="lang-en">Roasted in small batches</span>
                </h2>
              </div>
              <dl className="product-facts-list">
                <ProductFact label="Roast level" value={product.roast_level} />
                <ProductFact label="Roasted" value={product.roasted_date} />
              </dl>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
