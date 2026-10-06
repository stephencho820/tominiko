import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { synchronizeProductPricing } from "@/lib/product-admin";

const allowed = new Set(["name", "korean_name", "subtitle", "slug", "short_description", "product_type", "category", "status", "origin", "region", "producer", "washing_station", "variety", "process", "altitude", "harvest", "grade", "roast_level", "tasting_notes", "description", "about", "why_we_chose_it", "roaster_note", "roasted_date", "price_150g", "price_150g_original", "price_400g_original", "price_400g", "sale_price", "stock_quantity", "active", "featured", "todays_roast", "discovery_tags", "display_order", "image_url", "gallery_images", "acidity", "sweetness", "body", "recommended_brewing_methods", "brewing_dose", "brewing_water", "brewing_temperature", "brewing_grind", "brewing_time", "use_default_recipe", "variants"]);

async function payloadFrom(request: Request) {
  const value: unknown = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON body");
  const raw = value as Record<string, unknown>;
  return { id: raw.id, payload: Object.fromEntries(Object.entries(raw).filter(([key]) => allowed.has(key))) };
}

const productTypes = new Set(["single-origin", "blend", "decaf"]);
const discoveryTags = new Set(["todays-roast", "nutty-comforting", "bright-fruity", "decaf", "morning-boost", "something-special", "for-gifting", "easy-brewing", "고소하고 편안한", "화사하고 산뜻한", "디카페인", "블렌드", "특별한 날"]);

function validate(payload: Record<string, unknown>) {
  if ("status" in payload) {
    if (!["draft", "active", "sold-out", "hidden"].includes(String(payload.status))) return "invalid status";
    payload.active = payload.status === "active" || payload.status === "sold-out";
    if (payload.status !== "active") payload.todays_roast = false;
  } else { delete payload.active; }
  for (const key of ["price_150g", "price_400g", "stock_quantity", "display_order"]) {
    if (key in payload && (!Number.isInteger(payload[key]) || Number(payload[key]) < 0)) return `${key} must be a positive whole number`;
  }
  if ("product_type" in payload && !productTypes.has(String(payload.product_type))) return "invalid product_type";
  for (const key of ["acidity", "sweetness", "body"]) if (key in payload && (Number(payload[key]) < 1 || Number(payload[key]) > 5)) return `${key} must be between 1 and 5`;
  if ("variants" in payload) {
    try { synchronizeProductPricing(payload); } catch (error) { return error instanceof Error ? error.message : "invalid variants"; }
  }
  if ("discovery_tags" in payload && (!Array.isArray(payload.discovery_tags) || payload.discovery_tags.some((tag) => typeof tag !== "string" || !discoveryTags.has(tag)))) return "discovery_tags contains an invalid tag";
  return null;
}

export async function POST(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let payload: Record<string, unknown>;
  try { ({ payload } = await payloadFrom(request)); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const invalid = validate(payload); if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (!payload.name || !payload.slug || !payload.origin) return NextResponse.json({ error: "Name, slug and origin are required" }, { status: 400 });
  const { data, error } = await supabase.from("products").insert(payload).select().single();
  return error ? NextResponse.json({ error: "변경 사항을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 400 }) : NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let id: unknown; let payload: Record<string, unknown>;
  try { ({ id, payload } = await payloadFrom(request)); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof id !== "string") return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const invalid = validate(payload); if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (payload.todays_roast === true && !("status" in payload)) {
    const { data: current, error: lookupError } = await supabase.from("products").select("status").eq("id", id).single();
    if (lookupError || !current) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    if (current.status !== "active") payload.todays_roast = false;
  }
  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select().single();
  return error ? NextResponse.json({ error: "변경 사항을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let id: unknown;
  try { ({ id } = await request.json()); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof id !== "string") return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  // Admin RLS permits all order items and reviews, including unpublished reviews.
  // Fail closed: a failed lookup must never permit a cascading delete.
  const references = await Promise.all([
    supabase.from("order_items").select("id").eq("product_id", id).limit(1),
    supabase.from("reviews").select("id").eq("product_id", id).limit(1),
  ]);
  if (references.some(result => result.error)) return NextResponse.json({ error: "상품 참조 이력을 확인하지 못했습니다. 삭제를 중단했습니다." }, { status: 503 });
  if (references.some(result => (result.data?.length ?? 0) > 0)) return NextResponse.json({ error: "주문 또는 리뷰 이력이 있는 상품은 삭제할 수 없습니다. Hidden 상태로 변경해 주세요." }, { status: 409 });
  const { error } = await supabase.from("products").delete().eq("id", id);
  return error ? NextResponse.json({ error: "변경 사항을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 400 }) : NextResponse.json({ ok: true });
}
