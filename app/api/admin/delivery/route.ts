import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isUUID, validateDeliverySettings, validateDeliveryZone } from "@/lib/admin-delivery-validation";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const outcome = (error: unknown) => error ? fail("배송 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500) : NextResponse.json({ ok: true });

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail("올바른 요청을 보내 주세요.");
  } catch { return fail("올바른 JSON 요청을 보내 주세요."); }

  // Validate before opening a database client, including malformed IDs.
  let settingsPayload;
  let zonePayload;
  if (body.action === "settings") {
    const result = validateDeliverySettings(body);
    if (result.error) return fail(result.error);
    settingsPayload = result.data;
  } else if (body.action === "zone") {
    const result = validateDeliveryZone(body);
    if (result.error) return fail(result.error);
    zonePayload = result.data;
  } else if (body.action === "toggle" || body.action === "delete") {
    if (!isUUID(body.id) || (body.action === "toggle" && typeof body.enabled !== "boolean")) return fail("올바른 지역 ID와 상태를 보내 주세요.");
  } else return fail("올바른 작업을 선택해 주세요.");

  try {
    const supabase = await getAdminClient();
    if (!supabase) return fail("권한이 없습니다.", 403);
    if (body.action === "settings") {
      const { error } = await supabase.from("delivery_settings").upsert({ ...settingsPayload, updated_at: new Date().toISOString() });
      return outcome(error);
    }
    if (body.action === "zone") {
      const { error } = await supabase.from("local_delivery_zones").insert(zonePayload!);
      return outcome(error);
    }
    const query = body.action === "toggle"
      ? supabase.from("local_delivery_zones").update({ enabled: body.enabled }).eq("id", body.id)
      : supabase.from("local_delivery_zones").delete().eq("id", body.id);
    const { data, error } = await query.select("id").maybeSingle();
    if (error) return outcome(error);
    return data ? outcome(null) : fail("배송 지역을 찾을 수 없습니다.", 404);
  } catch { return outcome(true); }
}
