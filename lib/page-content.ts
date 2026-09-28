import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { runSupabaseQuery } from "@/lib/supabase/query";
import { defaultPageSettings, type PageSettings, type PageSlug, type PromotionBanner } from "@/lib/page-content-config";

function isPromotionBanner(item: unknown): item is PromotionBanner {
  if (!item || typeof item !== "object") return false;
  const banner = item as Record<string, unknown>;
  return typeof banner.id === "string" && typeof banner.image === "string" && typeof banner.hyperlink === "string"
    && (banner.placement === "tasting-room" || banner.placement === "our-story")
    && (typeof banner.mobileImage === "string" || typeof banner.mobileImage === "undefined")
    && typeof banner.active === "boolean" && typeof banner.sortOrder === "number" && typeof banner.alt === "string";
}

function mergePageSettings(fallback: PageSettings, data: { texts: unknown; images: unknown; hero_media?: unknown; promotions?: unknown }): PageSettings {
  const storedTexts = data.texts && typeof data.texts === "object" ? data.texts as Record<string, unknown> : {};
  const storedImages = data.images && typeof data.images === "object" ? data.images as Record<string, unknown> : {};

  const texts = Object.fromEntries(Object.entries(fallback.texts).map(([key, defaultSetting]) => {
    const stored = storedTexts[key];
    if (!stored || typeof stored !== "object") return [key, defaultSetting];
    const candidate = stored as Record<string, unknown>;
    return [key, {
      value: typeof candidate.value === "string" ? candidate.value : defaultSetting.value,
      font: candidate.font === "sans" || candidate.font === "display" || candidate.font === "serif" ? candidate.font : defaultSetting.font,
      size: typeof candidate.size === "string" ? candidate.size : defaultSetting.size,
    }];
  }));

  const images = Object.fromEntries(Object.entries(fallback.images).map(([key, defaultImage]) => [
    key,
    typeof storedImages[key] === "string" ? storedImages[key] : defaultImage,
  ]));

  const rawHero = data.hero_media && typeof data.hero_media === "object" ? data.hero_media as Record<string, unknown> : null;
  const heroMedia = rawHero && typeof rawHero.url === "string" && (rawHero.type === "image" || rawHero.type === "video")
    ? { url: rawHero.url, type: rawHero.type as "image" | "video", mobileUrl: typeof rawHero.mobileUrl === "string" ? rawHero.mobileUrl : "", mobileType: rawHero.mobileType === "video" ? "video" as const : "image" as const, active: rawHero.active !== false, overlay: rawHero.overlay !== false } : fallback.heroMedia;
  const storedPromotions = Array.isArray(data.promotions) ? data.promotions.filter(isPromotionBanner).map((banner) => ({ ...banner, mobileImage: banner.mobileImage ?? "" })) : [];
  const promotions = fallback.promotions?.map((defaultBanner) =>
    storedPromotions.find((banner) => banner.placement === defaultBanner.placement) ?? defaultBanner
  );
  return { texts, images, heroMedia, promotions };
}

export async function getPageSettings(slug: PageSlug): Promise<PageSettings> {
  const fallback = defaultPageSettings(slug);
  if (!hasSupabaseEnv) return fallback;
  try {
    const supabase = await createClient();
    const { data, error } = await runSupabaseQuery(async (signal) =>
      await supabase.from("page_settings").select("texts,images,hero_media,promotions").eq("slug", slug).abortSignal(signal).maybeSingle(),
    );
    if (error || !data) return fallback;
    return mergePageSettings(fallback, data);
  } catch {
    return fallback;
  }
}
