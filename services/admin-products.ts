import { createClient } from "@/lib/supabase/server";
import { runSupabaseQuery } from "@/lib/supabase/query";
import type { Product } from "@/types";

// Admin reads must distinguish an unavailable database from an empty catalog.
// Public catalog fallback behavior remains unchanged.
export async function loadAdminProducts(id?: string): Promise<{ products: Product[]; failed: boolean }> {
  try {
    const supabase = await createClient();
    let query = supabase.from("products").select("*");
    query = id ? query.eq("id", id) : query.order("display_order").order("created_at", { ascending: false });
    const { data, error } = await runSupabaseQuery(async signal => await query.abortSignal(signal));
    if (error) return { products: [], failed: true };
    return { products: (data ?? []) as Product[], failed: false };
  } catch { return { products: [], failed: true }; }
}
