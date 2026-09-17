import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

const statuses = new Set(["new", "confirmed", "roasting", "preparing", "ready_for_pickup", "shipped", "completed", "cancelled"]);

export async function PATCH(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, order_status: orderStatus } = await request.json();
  if (typeof id !== "string" || !statuses.has(orderStatus)) {
    return NextResponse.json({ error: "Invalid order update" }, { status: 400 });
  }

  const { error } = await supabase.from("orders").update({ order_status: orderStatus }).eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
