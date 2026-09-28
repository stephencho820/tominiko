import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { runSupabaseQuery } from "@/lib/supabase/query";
import { defaultPageSettings, type PageSettings, type PageSlug } from "@/lib/page-content-config";

function mergePageSettings(fallback: PageSettings, data: { texts: unknown; images: unknown }): PageSettings {
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

  return { texts, images };
}

export async function getPageSettings(slug: PageSlug): Promise<PageSettings> {
  const fallback = defaultPageSettings(slug);
  if (!hasSupabaseEnv) return fallback;
  try {
    const supabase = await createClient();
    const { data, error } = await runSupabaseQuery(async (signal) =>
      await supabase.from("page_settings").select("texts,images").eq("slug", slug).abortSignal(signal).maybeSingle(),
    );
    if (error || !data) return fallback;
    return mergePageSettings(fallback, data);
  } catch {
    return fallback;
  }
}
