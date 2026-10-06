import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Review, ReviewStats } from "@/types";

export async function getProductReviews(productId: string) {
  const empty = { reviews: [] as Review[], stats: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } as ReviewStats, allowGuests: false, user: null as null | { id: string; name: string } };
  if (!hasSupabaseEnv) return empty;
  const supabase = await createClient();
  const [{ data: reviews }, { data: summary }, { data: setting }, { data: auth }] = await Promise.all([
    supabase.from("reviews").select("*,review_images(*)").eq("product_id", productId).eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("product_review_summaries").select("*").eq("product_id", productId).maybeSingle(),
    supabase.from("review_settings").select("allow_guest_reviews").eq("id", true).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  let name = "";
  if (auth.user) { const { data } = await supabase.from("profiles").select("name").eq("id", auth.user.id).maybeSingle(); name = data?.name || auth.user.user_metadata?.name || auth.user.email?.split("@")[0] || ""; }
  return { reviews: (reviews ?? []) as Review[], stats: { average: Number(summary?.average_rating ?? 0), count: Number(summary?.review_count ?? 0), distribution: { 1: Number(summary?.rating_1 ?? 0), 2: Number(summary?.rating_2 ?? 0), 3: Number(summary?.rating_3 ?? 0), 4: Number(summary?.rating_4 ?? 0), 5: Number(summary?.rating_5 ?? 0) } }, allowGuests: Boolean(setting?.allow_guest_reviews), user: auth.user ? { id: auth.user.id, name } : null };
}

export async function attachReviewSummaries<T extends { id: string }>(products: T[]): Promise<(T & { review_average: number; review_count: number })[]> {
  if (!hasSupabaseEnv || !products.length) return products.map((p) => ({ ...p, review_average: 0, review_count: 0 }));
  const supabase = await createClient();
  const { data } = await supabase.from("product_review_summaries").select("product_id,average_rating,review_count").in("product_id", products.map((p) => p.id));
  const byId = new Map((data ?? []).map((row) => [row.product_id, row]));
  return products.map((product) => ({ ...product, review_average: Number(byId.get(product.id)?.average_rating ?? 0), review_count: Number(byId.get(product.id)?.review_count ?? 0) }));
}
