import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await getAdminClient(); if (!supabase) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  const body = await request.json();
  if (body.action === "settings") {
    const payload = { id: true, free_shipping_threshold: Math.max(0, Number(body.freeShippingThreshold)), standard_shipping_fee: Math.max(0, Number(body.standardShippingFee)), local_delivery_enabled: Boolean(body.localDeliveryEnabled), local_delivery_days: Array.isArray(body.localDeliveryDays) ? body.localDeliveryDays.map(Number) : [], local_delivery_message: String(body.localDeliveryMessage).slice(0, 500), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("delivery_settings").upsert(payload); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "zone") {
    const { error } = await supabase.from("local_delivery_zones").insert({ name: String(body.name).trim(), zone_type: body.zoneType, zone_value: String(body.zoneValue).trim(), enabled: true }); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "toggle") { const { error } = await supabase.from("local_delivery_zones").update({ enabled: Boolean(body.enabled) }).eq("id", body.id); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true }); }
  if (body.action === "delete") { const { error } = await supabase.from("local_delivery_zones").delete().eq("id", body.id); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true }); }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
