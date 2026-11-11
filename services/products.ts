import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { runSupabaseQuery } from "@/lib/supabase/query";
import type { Product } from "@/types";
import { attachReviewSummaries } from "@/services/reviews";

function productQueryFailed(action: string, cause: unknown): never {
  // Server-side diagnostics only. Never expose database details to shoppers.
  console.error(`[products] ${action} failed`, cause);
  throw new Error("Product data is temporarily unavailable");
}

export async function getProducts(options?: { activeOnly?: boolean; todaysRoast?: boolean; featured?: boolean; latestFirst?: boolean }) {
  if (!hasSupabaseEnv) return productQueryFailed("configuration", "Supabase is not configured");
  try {
    const supabase = await createClient();
    let query = supabase.from("products").select("*");
    query = options?.latestFirst ? query.order("created_at", { ascending: false }) : query.order("display_order").order("created_at", { ascending: false });
    // Active out-of-stock products should remain in the catalog as SOLD OUT.
    if (options?.activeOnly) query = query.in("status", ["active", "sold-out"]);
    if (options?.todaysRoast) query = query.eq("todays_roast", true);
    if (options?.featured) query = query.eq("featured", true);
    const { data, error } = await runSupabaseQuery(async (signal) => await query.abortSignal(signal));
    if (error) throw error;
    return await attachReviewSummaries((data ?? []) as Product[]);
  } catch (error) {
    return productQueryFailed("list", error);
  }
}

export async function getTastingRoomProducts() {
  const products = await getProducts({ activeOnly: true });
  return products.filter((product) => (product.sales_channels ?? ["online"]).includes("tasting_room"));
}

export async function getProduct(slug: string, options?: { includeInactive?: boolean }) {
  if (!hasSupabaseEnv) return productQueryFailed("configuration", "Supabase is not configured");
  try {
    const supabase = await createClient();
    const base = supabase.from("products").select("*").eq("slug", slug);
    const query = options?.includeInactive ? base : base.in("status", ["active", "sold-out"]);
    // maybeSingle distinguishes a missing product (404) from a database outage.
    const { data, error } = await runSupabaseQuery(async (signal) => await query.abortSignal(signal).maybeSingle());
    if (error) throw error;
    if (!data) return null;
    return (await attachReviewSummaries([data as Product]))[0];
  } catch (error) {
    return productQueryFailed("detail", error);
  }
}
