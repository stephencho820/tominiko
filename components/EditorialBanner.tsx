import type { BannerPlacement, PromotionBanner } from "@/lib/page-content-config";

export function EditorialBanner({ banners, placement }: { banners: PromotionBanner[]; placement: BannerPlacement }) {
  const banner = banners.find((item) => item.placement === placement && item.active && item.image);
  if (!banner) return null;

  return <section className={`editorial-home-banner editorial-home-banner-${placement}`} aria-label={banner.alt}>
    <a href={banner.hyperlink || (placement === "our-story" ? "/our-story" : "/tasting-room")}>
      <picture>
        {banner.mobileImage && <source media="(max-width: 760px)" srcSet={banner.mobileImage} />}
        <img src={banner.image} alt={banner.alt} />
      </picture>
    </a>
  </section>;
}
