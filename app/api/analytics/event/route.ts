import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
const allowed = new Set(["page_view","product_view","add_to_cart","checkout_start","order_placed"]);
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return new Response(null, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !allowed.has(body.event) || typeof body.path !== "string" || body.path.length > 200 ||
      !body.path.startsWith("/") || body.path.startsWith("//") || typeof body.sessionId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(body.sessionId)) return new Response(null, { status: 400 });
  if (body.path.startsWith("/admin") || body.path.startsWith("/api") || body.path.startsWith("/account")) return new Response(null, { status: 204 });
  const source = typeof body.source === "string" ? body.source.slice(0,40).replace(/[^a-zA-Z0-9_-]/g,"") : "direct";
  const device = body.device === "mobile" ? "mobile" : "desktop";
  const productId = typeof body.productId === "string" && /^[0-9a-f-]{36}$/i.test(body.productId) ? body.productId : null;
  const { error } = await createServiceClient().from("site_analytics_events").insert({
    session_id: body.sessionId, event_name: body.event, path: body.path.split("?")[0].split("#")[0],
    source: source || "direct", device, product_id: productId,
  });
  if (error) return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
