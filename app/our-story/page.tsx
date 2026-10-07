import Image from "next/image";
import Link from "next/link";
import { OurStoryHero } from "@/components/OurStoryHero";
import { PageText } from "@/components/PageText";
import { getPageSettings } from "@/lib/page-content";

function RoasterVisual() {
  return <figure className="zero-philosophy__visual" aria-label="Zero Degrees small batch coffee roaster illustration">
    <div className="zero-philosophy__halo" aria-hidden="true" />
    <div className="zero-philosophy__steam" aria-hidden="true">
      {[0, 1, 2].map((line) => <span key={line}>
        <svg viewBox="0 0 24 72" focusable="false"><path d="M13 70 C1 55, 22 43, 10 29 C2 20, 17 10, 12 1" /></svg>
      </span>)}
    </div>
    <Image src="/images/philosophy/zero-degrees.png" width={1280} height={1280} sizes="(max-width: 768px) 88vw, 48vw" alt="Small batch drum coffee roaster drawn in fine lines" />
    <figcaption>SMALL BATCH · ORIGIN FIRST · FRESH ROAST</figcaption>
  </figure>;
}

export default async function OurStoryPage() {
  const content = await getPageSettings("our-story");

  return <main className="philosophy-page">
    <OurStoryHero settings={content} />
    <section className="zero-philosophy" id="zero-degrees" aria-label="Zero Degrees roasting philosophy">
      <div className="zero-philosophy__hero">
        <div className="zero-philosophy__copy">
          <PageText as="p" className="section-label" setting={content.texts.philosophy_eyebrow} />
          <p className="zero-philosophy__brand"><span>ZERO</span><span>DEGREES</span></p>
          <PageText as="h2" setting={content.texts.philosophy_title} />
          <PageText as="p" className="zero-philosophy__description" setting={content.texts.philosophy_description} />
        </div>
        <RoasterVisual />
      </div>
      <div className="zero-principles">
        {[1, 2, 3].map((number) => <article key={number}>
          <PageText as="span" setting={content.texts[`principle_${number}_number`]} />
          <PageText as="h3" setting={content.texts[`principle_${number}_title`]} />
          <PageText as="p" setting={content.texts[`principle_${number}_description`]} />
        </article>)}
      </div>
      <div className="philosophy-next">
        <div><p className="section-label">FROM ROASTER TO CUP</p><h2>향긋한 커피를 직접 만나보세요.</h2><div className="philosophy-next-actions"><Link href="/shop">SHOP COFFEE →</Link><Link href="/tasting-room">VISIT TASTING ROOM →</Link></div></div>
      </div>
    </section>
  </main>;
}
