import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { defaultPageSettings, type PageSettings, type PageSlug, type TextSetting } from "@/lib/page-content-config";

const validFonts = new Set<TextSetting["font"]>(["inherit", "serif", "sans", "display"]);
const validSize = (value: unknown) => typeof value === "string" && value.length <= 40 && !/[;{}]/.test(value);

/**
 * Public content must never make a storefront request depend on an auth cookie or
 * an unhealthy CMS table. Any missing/malformed value is replaced independently.
 */
export async function getPageSettings(slug: PageSlug): Promise<PageSettings> {
  // Admin edits must be visible on the very next request; these pages must not
  // be frozen with build-time CMS values.
  noStore();
  const fallback = defaultPageSettings(slug);
  if (!hasSupabaseEnv) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_200);
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.from("page_settings").select("texts,images").eq("slug", slug).abortSignal(controller.signal).maybeSingle();
    if (error || !data) return fallback;

    const storedTexts = data.texts && typeof data.texts === "object" && !Array.isArray(data.texts) ? data.texts as Record<string, unknown> : {};
    // The first CMS release accidentally saved `serif` for every field, overriding
    // headings whose design was sans/display. Recognize that exact legacy shape
    // and restore inherited page typography without touching intentional mixes.
    const storedValues = Object.values(storedTexts);
    const legacyAllSerif = storedValues.length > 0 && storedValues.every((value) => value && typeof value === "object" && !Array.isArray(value) && (value as Partial<TextSetting>).font === "serif" && !(value as Partial<TextSetting>).size);
    const texts = Object.fromEntries(Object.entries(fallback.texts).map(([key, original]) => {
      const stored = storedTexts[key];
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) return [key, original];
      const candidate = stored as Partial<TextSetting>;
      return [key, {
        value: typeof candidate.value === "string" ? candidate.value : original.value,
        font: legacyAllSerif ? "inherit" : validFonts.has(candidate.font as TextSetting["font"]) ? candidate.font as TextSetting["font"] : original.font,
        size: validSize(candidate.size) ? candidate.size as string : original.size,
      }];
    }));
    const storedImages = data.images && typeof data.images === "object" && !Array.isArray(data.images) ? data.images as Record<string, unknown> : {};
    const images = Object.fromEntries(Object.entries(fallback.images).map(([key, value]) => {
      const stored = storedImages[key];
      return [key, typeof stored === "string" && (!stored || /^https:\/\//.test(stored)) ? stored : value];
    }));
    return { texts, images };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
