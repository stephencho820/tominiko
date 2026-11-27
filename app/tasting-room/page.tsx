import type { Metadata } from "next";
import Link from "next/link";
import { TastingRoomGallery } from "@/components/TastingRoomGallery";
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
  const actions = [
    { href: "/tasting-room/menu", label: "테이스팅 메뉴" },
    { href: "#visit", label: "방문 안내" },
    { href: "/shop", label: "원두 구매" },
    { href: "/our-story", label: "우리 이야기" },
  ];

  return (
    <main className="bg-[#f8f7f3] text-[#24241f]">
      <div className="mx-auto max-w-[1600px] px-5 pb-20 md:px-12 md:pb-28">
        <section aria-labelledby="tasting-room-title">
          <div className="grid gap-4 pt-10 pb-7 md:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] md:items-end md:gap-12 md:pt-16 md:pb-9">
            <h1 id="tasting-room-title" className="text-[clamp(1.75rem,4vw,3.75rem)] leading-[1.12] font-medium tracking-[-.055em]">
              Tasting Room
            </h1>
            <p className="max-w-[32ch] text-sm leading-[1.8] tracking-[-.02em] text-[#57564d] md:justify-self-end">
              Casa di Stefano에서 Zero Degrees가 볶은 커피를 직접 맛보세요.
            </p>
          </div>
          <picture className="block [&>img]:block [&>img]:h-auto [&>img]:w-full">
            <source media="(max-width: 700px)" srcSet={room.mobileHeroImage || defaultMobileHero} />
            <SafeHeroImage src={heroImage} fallback={defaultHero} alt="Casa di Stefano Tasting Room" />
          </picture>
          <nav aria-label="테이스팅룸 바로가기" className="grid grid-cols-2 border-b border-[#d5d3c9] md:grid-cols-4">
            {actions.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-12 items-center justify-between gap-2 border-t border-[#d5d3c9] px-2 text-xs font-medium transition-colors hover:bg-[#eeece4] focus-visible:outline-offset-[-3px] md:px-4 md:text-sm"
              >
                {label}
                <span aria-hidden="true">{href === "#visit" ? "↓" : "↗"}</span>
              </Link>
            ))}
          </nav>
        </section>

        {room.galleryImages.length > 0 && (
          <section aria-labelledby="space-title" className="mt-16 md:mt-24">
            <h2 id="space-title" className="mb-4 text-sm font-medium md:mb-6">공간 사진</h2>
            <TastingRoomGallery images={room.galleryImages} />
          </section>
        )}

        <section id="visit" aria-labelledby="visit-title" className="mt-16 scroll-mt-24 border-t border-[#d5d3c9] pt-5 md:mt-24 md:pt-7">
          <h2 id="visit-title" className="mb-5 text-sm font-medium md:mb-7">방문 안내</h2>
          <div className="grid items-start gap-7 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-14">
            <a href={naverMapHref} target="_blank" rel="noopener noreferrer" className="block" aria-label="네이버 지도에서 위치 보기">
              <img
                src={room.mapImage || "/images/tasting-room/map-casa-user.svg"}
                alt="Casa di Stefano 테이스팅룸 위치 지도"
                loading="lazy"
                className="block h-auto w-full"
              />
            </a>
            <dl className="m-0 text-sm leading-[1.75]">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-t border-[#d5d3c9] py-4">
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
                <dd className="m-0 whitespace-pre-line">{room.openingHours || "추후 안내"}</dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-y border-[#d5d3c9] py-4">
                <dt className="text-[#57564d]">방문·예약</dt>
                <dd className="m-0">
                  <a href={BUSINESS_INFO.contactUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    카카오톡으로 문의 ↗
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  );
}
