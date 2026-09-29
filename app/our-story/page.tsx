import { OurStoryHero } from "@/components/OurStoryHero";
import { PageText } from "@/components/PageText";
import { getPageSettings } from "@/lib/page-content";

export default async function OurStoryPage() {
  const content = await getPageSettings("our-story");

  return <main className="philosophy-page">
    <OurStoryHero settings={content} />
    <section className="zero-philosophy" id="zero-degrees" aria-label="Zero Degrees roasting philosophy">
      <div className="zero-philosophy__intro">
        <div>
          <p className="zero-philosophy__brand">ZERO DEGREES</p>
          <PageText as="p" className="section-label" setting={content.texts.philosophy_eyebrow} />
        </div>
        <div>
          <PageText as="h2" setting={content.texts.philosophy_title} />
          <PageText as="p" className="zero-philosophy__description" setting={content.texts.philosophy_description} />
        </div>
      </div>
      <div className="zero-principles">
        {[1, 2, 3].map((number) => <article key={number}>
          <PageText as="span" setting={content.texts[`principle_${number}_number`]} />
          <PageText as="h3" setting={content.texts[`principle_${number}_title`]} />
          <PageText as="p" setting={content.texts[`principle_${number}_description`]} />
        </article>)}
      </div>
    </section>
  </main>;
}
