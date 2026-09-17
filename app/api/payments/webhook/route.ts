import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cancelPayment, getPayment, isConfirmedPayment } from "@/services/payment";

export async function POST(request: Request) {
  let event: { eventType?: unknown; data?: { paymentKey?: unknown; orderId?: unknown } };
  try { event = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const paymentKey = typeof event.data?.paymentKey === "string" ? event.data.paymentKey : "";
  if (!paymentKey) return NextResponse.json({ ok: true });

  // Toss webhooks are never trusted directly: retrieve the canonical payment with the server secret.
  let payment;
  try { payment = await getPayment(paymentKey); } catch { return NextResponse.json({ ok: false }, { status: 502 }); }
  const supabase = createServiceClient();
  const { data: order } = await supabase.from("orders").select("id,total,payment_status,payment_key").eq("id", payment.orderId).maybeSingle();
  if (!order) return NextResponse.json({ ok: true });

  if (isConfirmedPayment(payment, order.id, order.total)) {
    const { data: result } = await supabase.rpc("finalize_paid_order", {
      p_order_id: order.id, p_payment_key: payment.paymentKey, p_amount: payment.totalAmount,
      p_method: payment.method ?? null, p_approved_at: payment.approvedAt ?? new Date().toISOString(),
    });
    if (!["paid", "already_paid"].includes(result)) {
      await cancelPayment(payment.paymentKey, "재고 부족으로 인한 자동 취소").catch(() => undefined);
      await supabase.rpc("record_payment_failure", { p_order_id: order.id, p_code: result ?? "FINALIZE_FAILED", p_message: "Payment automatically cancelled", p_cancelled: true });
      return NextResponse.json({ ok: false }, { status: 409 });
    }
  } else if (payment.status === "CANCELED" && order.payment_status === "paid" && order.payment_key === payment.paymentKey) {
    // A refund changes payment accounting only; sold inventory is intentionally not added back automatically.
    await supabase.rpc("record_payment_refund", { p_order_id: order.id, p_payment_key: payment.paymentKey });
  } else if (["CANCELED", "EXPIRED", "ABORTED"].includes(payment.status) && order.payment_status !== "paid") {
    await supabase.rpc("record_payment_failure", { p_order_id: order.id, p_code: payment.status, p_message: "Payment cancelled", p_cancelled: true });
  }
  return NextResponse.json({ ok: true });
}
