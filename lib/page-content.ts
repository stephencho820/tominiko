import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { runSupabaseQuery } from "@/lib/supabase/query";
import { defaultPageSettings, type GalleryImage, type PageSettings, type PageSlug, type PromotionBanner } from "@/lib/page-content-config";

function isPromotionBanner(item: unknown): item is PromotionBanner {
  if (!item || typeof item !== "object") return false;
  const banner = item as Record<string, unknown>;
  return typeof banner.id === "string" && typeof banner.image === "string" && typeof banner.hyperlink === "string"
    && (banner.placement === "tasting-room" || banner.placement === "our-story")
    && (typeof banner.mobileImage === "string" || typeof banner.mobileImage === "undefined")
    && typeof banner.active === "boolean" && typeof banner.sortOrder === "number" && typeof banner.alt === "string";
}

function isGalleryImage(item: unknown): item is GalleryImage {
  if (!item || typeof item !== "object") return false;
  const image = item as Record<string, unknown>;
  return typeof image.id === "string" && typeof image.url === "string" && typeof image.alt === "string" && typeof image.order === "number";
}

function mergePageSettings(fallback: PageSettings, data: { texts: unknown; images: unknown; hero_media?: unknown; promotions?: unknown; tasting_room?: unknown }): PageSettings {
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
  const rawRoom = data.tasting_room && typeof data.tasting_room === "object" ? data.tasting_room as Record<string, unknown> : null;
  const roomFallback = fallback.tastingRoom;
  const tastingRoom = roomFallback && rawRoom ? {
    heroImage: typeof rawRoom.heroImage === "string" && rawRoom.heroImage ? rawRoom.heroImage : roomFallback.heroImage,
    mobileHeroImage: typeof rawRoom.mobileHeroImage === "string" ? rawRoom.mobileHeroImage : roomFallback.mobileHeroImage,
    address: typeof rawRoom.address === "string" ? rawRoom.address : roomFallback.address,
    phone: typeof rawRoom.phone === "string" ? rawRoom.phone : roomFallback.phone,
    phoneNote: typeof rawRoom.phoneNote === "string" ? rawRoom.phoneNote : roomFallback.phoneNote,
    openingHours: typeof rawRoom.openingHours === "string" ? rawRoom.openingHours : roomFallback.openingHours,
    galleryImages: Array.isArray(rawRoom.galleryImages) ? rawRoom.galleryImages.filter(isGalleryImage).sort((a, b) => a.order - b.order) : roomFallback.galleryImages,
  } : roomFallback;
  return { texts, images, heroMedia, promotions, tastingRoom };
}

export async function getAdminPageSettings(slug: PageSlug): Promise<
  { status: "loaded" | "missing"; settings: PageSettings } | { status: "error" }
> {
  if (!hasSupabaseEnv) return { status: "error" };
  try {
    const supabase = await createClient();
    const { data, error } = await runSupabaseQuery(async (signal) =>
      await supabase.from("page_settings").select("texts,images,hero_media,promotions,tasting_room").eq("slug", slug).abortSignal(signal).maybeSingle(),
    );
    if (error) return { status: "error" };
    const fallback = defaultPageSettings(slug);
    return data ? { status: "loaded", settings: mergePageSettings(fallback, data) } : { status: "missing", settings: fallback };
  } catch {
    return { status: "error" };
  }
}

export async function getPageSettings(slug: PageSlug): Promise<PageSettings> {
  const fallback = defaultPageSettings(slug);
  if (!hasSupabaseEnv) return fallback;
  try {
    const supabase = await createClient();
    const { data, error } = await runSupabaseQuery(async (signal) =>
      await supabase.from("page_settings").select("texts,images,hero_media,promotions,tasting_room").eq("slug", slug).abortSignal(signal).maybeSingle(),
    );
    if (error || !data) return fallback;
    return mergePageSettings(fallback, data);
  } catch {
    return fallback;
  }
}
