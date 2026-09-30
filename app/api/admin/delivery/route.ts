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
    const zoneTypes = new Set(["district", "address_keyword", "postal_prefix", "postal_range"]);
    const name = String(body.name ?? "").trim(); const zoneValue = String(body.zoneValue ?? "").trim();
    if (!name || !zoneTypes.has(body.zoneType) || zoneValue.length < 2) return NextResponse.json({ error: "지역명과 2자 이상의 올바른 지역 값을 입력해 주세요." }, { status: 400 });
    const { error } = await supabase.from("local_delivery_zones").insert({ name, zone_type: body.zoneType, zone_value: zoneValue, enabled: true }); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (body.action === "toggle") { const { error } = await supabase.from("local_delivery_zones").update({ enabled: Boolean(body.enabled) }).eq("id", body.id); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true }); }
  if (body.action === "delete") { const { error } = await supabase.from("local_delivery_zones").delete().eq("id", body.id); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true }); }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
