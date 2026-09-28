import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { runSupabaseQuery } from "@/lib/supabase/query";
import type { Product } from "@/types";

export async function getProducts(options?: { activeOnly?: boolean; todaysRoast?: boolean }) {
  if (!hasSupabaseEnv) return [] as Product[];
  try {
    const supabase = await createClient();
    let query = supabase.from("products").select("*").order("display_order").order("created_at", { ascending: false });
    if (options?.activeOnly) query = query.eq("active", true).gt("stock_quantity", 0);
    if (options?.todaysRoast) query = query.eq("todays_roast", true);
    const { data, error } = await runSupabaseQuery(async (signal) => await query.abortSignal(signal));
    if (error) return [] as Product[];
    return (data ?? []) as Product[];
  } catch {
    return [] as Product[];
  }
}
export async function getProduct(slug: string) {
  if (!hasSupabaseEnv) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await runSupabaseQuery(async (signal) =>
      await supabase.from("products").select("*").eq("slug", slug).abortSignal(signal).single(),
    );
    return error ? null : data as Product | null;
  } catch {
    return null;
  }
}
