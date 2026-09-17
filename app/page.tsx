import { getProducts } from "@/services/products";
import { HomeStory } from "@/components/HomeStory";

export default async function Home() {
  const roast = await getProducts({ activeOnly: true, todaysRoast: true });
  const featured = roast.length ? roast : await getProducts({ activeOnly: true });

  return <HomeStory product={featured[0] ?? null} />;
  /* return (
    <main>
      <section className="hero-panel relative isolate overflow-hidden px-6 py-10 md:px-12 md:py-14">
        <div className="absolute inset-0 -z-10 bg-[rgba(64,46,36,0.18)]" />

        <div className="relative z-10 flex min-h-[calc(100vh-76px)] flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="eyebrow text-[var(--paper)]/80">
              <span className="lang-ko">수원 · 커피 로스터리 &amp; 테이스팅 룸</span>
              <span className="lang-en">Coffee roastery &amp; tasting room · Suwon</span>
            </div>
            <span className="hidden sans text-xs text-[var(--paper)]/75 md:block" />
          </div>

          <div className="relative max-w-5xl pb-8">
            <p className="section-label mb-6 text-[var(--paper)]/85">Casa di Stefano</p>
            <h1 className="max-w-3xl text-4xl leading-[.95] tracking-[-.05em] text-[var(--paper)] md:text-7xl">
              <span className="lang-ko">
                매일의 커피에<br />
                <i>조금 더 좋은 순간을.</i>
              </span>
              <span className="lang-en">
                Good beans.<br />
                <i>Thoughtfully roasted.</i>
              </span>
            </h1>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link href="/shop" className="button-primary sans px-6 py-4 text-xs font-bold tracking-[.15em]">
                <span className="lang-ko">커피 둘러보기</span>
                <span className="lang-en">SHOP THE ROASTS</span> <span className="ml-4">↗</span>
              </Link>
              <span className="sans text-xs text-[var(--paper)]/75">
                <span className="lang-ko">매주 수원에서 로스팅</span>
                <span className="lang-en">Roasted weekly in Suwon</span>
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between border-t border-[rgba(255,255,255,0.25)] pt-4">
            <span className="section-label text-[var(--paper)]/80">01 / 03</span>
            <span className="sans text-xs text-[var(--paper)]/75">
              <span className="lang-ko">스크롤하여 둘러보기</span>
              <span className="lang-en">Scroll to discover</span>
            </span>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12 md:py-28">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="section-label mb-3">
              <span className="lang-ko">로스터리에서</span>
              <span className="lang-en">From the roastery</span>
            </p>
            <p className="eyebrow mb-3 text-[var(--brown)]">TOMINIKO BEANS &amp; COFFEE</p>
            <h2 className="text-4xl md:text-5xl">
              <span className="lang-ko">오늘의 로스터리</span>
              <span className="lang-en">Freshly roasted</span>
            </h2>
          </div>
          <Link href="/shop" className="eyebrow border-b border-[var(--ink)] pb-1 transition-colors hover:text-[var(--accent)]">
            <span className="lang-ko">전체 보기</span>
            <span className="lang-en">View all</span> ↗
          </Link>
        </div>

        {featured.length ? (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        ) : (
          <p className="border-y border-[var(--line)] py-12 text-xl text-[var(--brown)]">
            <span className="lang-ko">다음 배치를 준비하고 있습니다. 곧 새로운 커피를 소개할게요.</span>
            <span className="lang-en">Our next batch is resting. New releases will appear here soon.</span>
          </p>
        )}
      </section>

      <section id="about" className="grid border-t border-[var(--line)] md:grid-cols-2">
        <div className="bg-[var(--brown)] px-6 py-20 text-[var(--ivory)] md:px-12 md:py-28">
          <p className="eyebrow mb-10 text-[#dcc6af]">Zero Degrees Coffee Roasters</p>
          <h2 className="max-w-lg text-5xl leading-tight md:text-6xl">
            <span className="lang-ko">더 나은 커피를 위한<br />조용한 태도.</span>
            <span className="lang-en">A quieter approach to better coffee.</span>
          </h2>
        </div>

        <div className="px-6 py-20 md:px-12 md:py-28">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="section-label">01</p>
              <h3 className="mt-4 text-xl">
                <span className="lang-ko">ZERO ADDITIVES</span>
                <span className="lang-en">ZERO ADDITIVES</span>
              </h3>
              <p className="mt-3 text-[var(--muted)]">
                <span className="lang-ko">필요 없는 건 넣지 않습니다.</span>
                <span className="lang-en">Nothing unnecessary added.</span>
              </p>
            </div>
            <div>
              <p className="section-label">02</p>
              <h3 className="mt-4 text-xl">
                <span className="lang-ko">ZERO MASKING</span>
                <span className="lang-en">ZERO MASKING</span>
              </h3>
              <p className="mt-3 text-[var(--muted)]">
                <span className="lang-ko">콩의 본질을 가리지 않습니다.</span>
                <span className="lang-en">Never hide the character of the bean.</span>
              </p>
            </div>
            <div>
              <p className="section-label">03</p>
              <h3 className="mt-4 text-xl">
                <span className="lang-ko">ZERO GUESSWORK</span>
                <span className="lang-en">ZERO GUESSWORK</span>
              </h3>
              <p className="mt-3 text-[var(--muted)]">
                <span className="lang-ko">데이터와 경험으로 로스팅합니다.</span>
                <span className="lang-en">Roasting guided by data and experience.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  ); */
}
