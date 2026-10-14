import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tokenMatches } from "@/lib/order-access";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  let body: { orderId?: unknown; accessToken?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({error:"Invalid request"},{status:400}); }
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const token = typeof body?.accessToken === "string" ? body.accessToken : "";
  if (!uuid.test(orderId) || token.length < 32 || token.length > 256) return NextResponse.json({error:"Invalid request"},{status:400});
  const db = createServiceClient();
  const {data,error} = await db.from("orders").select("order_number,order_status,payment_status,payment_method,delivery_method,total,created_at,order_source,guest_access_token_hash,order_items(product_name,weight,grind,quantity,subtotal)").eq("id",orderId).maybeSingle();
  if (error) return NextResponse.json({error:"Order unavailable"},{status:503});
  if (!data || data.order_source === "tasting_room" || !tokenMatches(token,data.guest_access_token_hash)) return NextResponse.json({error:"Order not found"},{status:404});
  const {guest_access_token_hash:_hash,order_source:_source,...order}=data;
  return NextResponse.json({order},{headers:{"Cache-Control":"no-store"}});
}
