import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { defaultPageSettings, type PageSettings, type PageSlug } from "@/lib/page-content-config";

export async function getPageSettings(slug: PageSlug): Promise<PageSettings> {
  const fallback = defaultPageSettings(slug);
  if (!hasSupabaseEnv) return fallback;
  const supabase = await createClient();
  const { data } = await supabase.from("page_settings").select("texts,images").eq("slug", slug).maybeSingle();
  if (!data) return fallback;
  return { texts: { ...fallback.texts, ...(data.texts as PageSettings["texts"] ?? {}) }, images: { ...fallback.images, ...(data.images as PageSettings["images"] ?? {}) } };
}
