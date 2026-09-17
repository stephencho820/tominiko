import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tokenMatches } from "@/lib/order-access";

export async function POST(request: Request) {
  let input: { orderId?: unknown; code?: unknown; message?: unknown; accessToken?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  const accessToken = typeof input.accessToken === "string" ? input.accessToken : "";
  const supabase = createServiceClient();
  const { data: order } = await supabase.from("orders").select("id,guest_access_token_hash").eq("id", orderId).maybeSingle();
  if (!order || !tokenMatches(accessToken, order.guest_access_token_hash)) return NextResponse.json({ ok: false }, { status: 403 });
  await supabase.rpc("record_payment_failure", {
    p_order_id: order.id, p_code: typeof input.code === "string" ? input.code : "PAYMENT_FAILED",
    p_message: typeof input.message === "string" ? input.message : "Payment was not completed", p_cancelled: false,
  });
  return NextResponse.json({ ok: true });
}
