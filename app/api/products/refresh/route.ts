import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const ids = body && typeof body === "object" && Array.isArray((body as { ids?: unknown }).ids)
    ? [...new Set((body as { ids: unknown[] }).ids)] : [];
  if (!ids.length || ids.length > 50 || ids.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
    return NextResponse.json({ error: "Invalid product ids" }, { status: 400 });
  }
  if (!hasSupabaseEnv) return NextResponse.json({ products: [] });
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").in("id", ids).in("status", ["active", "sold-out"]);
  return error
    ? NextResponse.json({ error: "Could not refresh products" }, { status: 500 })
    : NextResponse.json({ products: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
