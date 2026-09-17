import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export async function getProducts(options?: { activeOnly?: boolean; todaysRoast?: boolean }) {
  if (!hasSupabaseEnv) return [] as Product[];
  const supabase = await createClient();
  let query = supabase.from("products").select("*").order("display_order").order("created_at", { ascending: false });
  if (options?.activeOnly) query = query.eq("active", true).gt("stock_quantity", 0);
  if (options?.todaysRoast) query = query.eq("todays_roast", true);
  const { data } = await query;
  return (data ?? []) as Product[];
}
export async function getProduct(slug: string) {
  if (!hasSupabaseEnv) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("slug", slug).single();
  return data as Product | null;
}