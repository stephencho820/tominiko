import { NextResponse } from "next/server";
import { orderStatusesForMethod } from "@/lib/admin";
import { getAdminClient } from "@/lib/supabase/admin";

const statuses = new Set(["new", "confirmed", "roasting", "preparing", "ready_for_pickup", "shipped", "completed", "cancelled"]);

export async function PATCH(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: unknown; order_status?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { id, order_status: orderStatus } = body;
  if (typeof id !== "string" || typeof orderStatus !== "string" || !statuses.has(orderStatus)) {
    return NextResponse.json({ error: "Invalid order update" }, { status: 400 });
  }

  const { data: order } = await supabase.from("orders").select("payment_status,delivery_method").eq("id", id).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!orderStatusesForMethod(order.delivery_method).includes(orderStatus)) {
    return NextResponse.json({ error: "Status is not available for this delivery method" }, { status: 400 });
  }
  if (order.payment_status !== "paid" && !["new", "confirmed", "cancelled"].includes(orderStatus)) {
    return NextResponse.json({ error: "Payment must be completed before fulfillment" }, { status: 409 });
  }
  const { error } = await supabase.from("orders").update({ order_status: orderStatus }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
