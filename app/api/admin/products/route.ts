import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

const allowed = new Set(["name", "slug", "origin", "region", "producer", "variety", "process", "roast_level", "tasting_notes", "description", "roasted_date", "price_150g", "price_150g_original", "price_300g", "stock_quantity", "active", "featured", "todays_roast", "display_order", "image_url"]);

async function payloadFrom(request: Request) {
  const raw = await request.json() as Record<string, unknown>;
  return { id: raw.id, payload: Object.fromEntries(Object.entries(raw).filter(([key]) => allowed.has(key))) };
}

function validate(payload: Record<string, unknown>) {
  for (const key of ["price_150g", "price_300g", "stock_quantity", "display_order"]) {
    if (key in payload && (!Number.isInteger(payload[key]) || Number(payload[key]) < 0)) return `${key} must be a positive whole number`;
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { payload } = await payloadFrom(request);
  const invalid = validate(payload); if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (!payload.name || !payload.slug || !payload.origin) return NextResponse.json({ error: "Name, slug and origin are required" }, { status: 400 });
  if (payload.todays_roast) await supabase.from("products").update({ todays_roast: false }).eq("todays_roast", true);
  const { data, error } = await supabase.from("products").insert(payload).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, payload } = await payloadFrom(request);
  if (typeof id !== "string") return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const invalid = validate(payload); if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (payload.todays_roast === true) {
    const { error: clearError } = await supabase.from("products").update({ todays_roast: false }).eq("todays_roast", true).neq("id", id);
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 });
  }
  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await request.json();
  if (typeof id !== "string") return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const { error } = await supabase.from("products").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
