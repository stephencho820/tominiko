import Link from "next/link";
import { PageText } from "./PageText";
import type { PageSettings } from "@/lib/page-content-config";

export function PhilosophySection({ content }: { content: PageSettings }) {
  return <Link href="/our-story" className="home-philosophy">
    <p className="section-label">OUR PHILOSOPHY · ZERO DEGREES</p>
    <div><h2><PageText className="lang-ko" setting={content.texts.brand_title_ko} /><PageText className="lang-en" setting={content.texts.brand_title_en} /></h2>
      <div><p><PageText className="lang-ko" setting={content.texts.brand_body_ko} /><PageText className="lang-en" setting={content.texts.brand_body_en} /></p><span><span className="lang-ko">OUR STORY 보기</span><span className="lang-en">Read our story</span> →</span></div>
    </div>
  </Link>;
}
