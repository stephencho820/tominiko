import type { Metadata } from "next";
import Link from "next/link";
import { SafeHeroImage } from "@/components/SafeHeroImage";
import { getPageSettings } from "@/lib/page-content";
import { BUSINESS_INFO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tasting Room",
  description: "수원 Casa di Stefano Tasting Room에서 Zero Degrees가 로스팅한 Tominiko 커피를 직접 만나보세요.",
  alternates: { canonical: "/tasting-room" },
};

const defaultHero = "/images/tasting-room-banner.svg";
const defaultMobileHero = "/images/tasting-room-banner-mobile.svg";

export default async function TastingRoomPage() {
  const content = await getPageSettings("tasting-room");
  const room = content.tastingRoom!;
  const heroImage = room.heroImage || defaultHero;
  const defaultMapHref = `https://map.naver.com/p/search/${encodeURIComponent("Casa Di Stefano")}`;
  const naverMapHref = /^https:\/\/[^\s]+$/i.test(room.mapLink) ? room.mapLink : defaultMapHref;
  const openingHours = room.openingHours
    .replace(/^[ \t]*[-–]?[ \t]*무인 카페[ \t]*:[ \t]*월[ \t]*[-–~][ \t]*일[ \t]*6시[ \t]*[-–~][ \t]*22시[ \t]*$/gm, "무인 카페　매일 06:00–22:00")
    .replace(/^[ \t]*[-–]?[ \t]*로스팅[ \t]*:[ \t]*매주 화[ \t]*:[ \t]*20시[ \t]*[-–~][ \t]*23시[ \t]*$/gm, "로스팅　매주 화요일 20:00–23:00");

  return (
    <main className="bg-[#f0efe9] text-[#24241f]">
      <div className="mx-auto max-w-[1600px] px-5 pt-5 pb-16 md:px-12 md:pt-10 md:pb-24">
        <section aria-labelledby="tasting-room-title">
          <h1 id="tasting-room-title" className="sr-only">Tasting Room</h1>
          <picture className="block [&>img]:block [&>img]:h-auto [&>img]:w-full">
            <source media="(max-width: 700px)" srcSet={room.mobileHeroImage || defaultMobileHero} />
            <SafeHeroImage src={heroImage} fallback={defaultHero} alt="Casa di Stefano Tasting Room" />
          </picture>
          <nav aria-label="테이스팅룸 바로가기" className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/tasting-room/menu" className="flex min-h-12 items-center justify-center gap-2 border border-solid border-[#d5d3c9] px-2 text-sm font-medium transition-colors hover:bg-[#eeece4]">
              테이스팅 메뉴 <span aria-hidden="true">↗</span>
            </Link>
            <a href="#visit" className="flex min-h-12 items-center justify-center gap-2 border-0 px-2 text-sm text-[#57564d] hover:underline hover:underline-offset-4">
              방문 안내 <span aria-hidden="true">↓</span>
            </a>
          </nav>
        </section>

        <section id="visit" aria-labelledby="visit-title" className="mt-10 scroll-mt-24 md:mt-16">
          <h2 id="visit-title" className="mb-5 text-sm font-medium md:mb-7">방문 안내</h2>
          <div className="grid items-start gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:gap-14">
            <dl className="m-0 text-sm leading-[1.75]">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 pb-4">
                <dt className="text-[#57564d]">주소</dt>
                <dd className="m-0">
                  <p className="whitespace-pre-line">{room.address || "추후 안내"}</p>
                  <a href={naverMapHref} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline underline-offset-4">
                    지도에서 위치 보기 ↗
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-t border-[#d5d3c9] py-4">
                <dt className="text-[#57564d]">영업시간</dt>
                <dd className="m-0 whitespace-pre-line">{openingHours || "추후 안내"}</dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 pt-2">
                <dt className="text-[#57564d]">방문·예약</dt>
                <dd className="m-0">
                  <a href={BUSINESS_INFO.contactUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    카카오톡으로 문의 ↗
                  </a>
                </dd>
              </div>
            </dl>
            <a href={naverMapHref} target="_blank" rel="noopener noreferrer" className="block md:col-start-2 md:row-start-1" aria-label="네이버 지도에서 위치 보기">
              <img
                src={room.mapImage || "/images/tasting-room/map-casa-user.svg"}
                alt="Casa di Stefano 테이스팅룸 위치 지도"
                loading="lazy"
                className="block h-auto w-full"
              />
            </a>
          </div>
        </section>
        <nav aria-label="관련 페이지" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#57564d]">
          <Link href="/shop" className="inline-flex min-h-11 items-center underline underline-offset-4">원두 구매 ↗</Link>
          <Link href="/our-story" className="inline-flex min-h-11 items-center underline underline-offset-4">우리 이야기 ↗</Link>
        </nav>
      </div>
    </main>
  );
}
