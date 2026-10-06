import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { runSupabaseQuery } from "@/lib/supabase/query";
import type { Product } from "@/types";
import { attachReviewSummaries } from "@/services/reviews";

export async function getProducts(options?: { activeOnly?: boolean; todaysRoast?: boolean; featured?: boolean; latestFirst?: boolean }) {
  if (!hasSupabaseEnv) return [] as Product[];
  try {
    const supabase = await createClient();
    let query = supabase.from("products").select("*");
    query = options?.latestFirst ? query.order("created_at", { ascending: false }) : query.order("display_order").order("created_at", { ascending: false });
    // Keep active out-of-stock products in the catalog so customers can see
    // the SOLD OUT state instead of having products silently disappear.
    if (options?.activeOnly) query = query.eq("active", true);
    if (options?.todaysRoast) query = query.eq("todays_roast", true);
    if (options?.featured) query = query.eq("featured", true);
    const { data, error } = await runSupabaseQuery(async (signal) => await query.abortSignal(signal));
    if (error) return [] as Product[];
    return await attachReviewSummaries((data ?? []) as Product[]);
  } catch {
    return [] as Product[];
  }
}
export async function getProduct(slug: string, options?: { includeInactive?: boolean }) {
  if (!hasSupabaseEnv) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await runSupabaseQuery(async (signal) =>
      await (options?.includeInactive ? supabase.from("products").select("*").eq("slug", slug) : supabase.from("products").select("*").eq("slug", slug).eq("active", true)).abortSignal(signal).single(),
    );
    if (error || !data) return null;
    return (await attachReviewSummaries([data as Product]))[0];
  } catch {
    return null;
  }
}
