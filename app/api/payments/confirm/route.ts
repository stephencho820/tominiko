import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tokenMatches } from "@/lib/order-access";
import { cancelPayment, confirmPayment, getPayment, isConfirmedPayment } from "@/services/payment";

const safeError = (status = 400) => NextResponse.json({ error: "결제를 확인하지 못했습니다. 결제 내역을 확인한 뒤 다시 시도해 주세요." }, { status });

export async function POST(request: Request) {
  let input: { paymentKey?: unknown; orderId?: unknown; amount?: unknown; accessToken?: unknown };
  try { input = await request.json(); } catch { return safeError(); }
  const paymentKey = typeof input.paymentKey === "string" ? input.paymentKey : "";
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  const accessToken = typeof input.accessToken === "string" ? input.accessToken : "";
  if (!paymentKey || !orderId || !Number.isInteger(input.amount)) return safeError();

  const supabase = createServiceClient();
  const { data: order } = await supabase.from("orders")
    .select("id,order_number,total,payment_status,payment_key,guest_access_token_hash")
    .eq("id", orderId).maybeSingle();
  if (!order || !tokenMatches(accessToken, order.guest_access_token_hash) || order.total !== input.amount) return safeError(403);

  if (order.payment_status === "paid" && order.payment_key === paymentKey) {
    return orderResponse(supabase, order.id);
  }

  let payment;
  try { payment = await confirmPayment(paymentKey, order.id, order.total); }
  catch (error) {
    // Recover if the first approval succeeded at Toss but its response/our DB commit was interrupted.
    try {
      const existing = await getPayment(paymentKey);
      if (isConfirmedPayment(existing, order.id, order.total)) payment = existing;
    } catch { /* Never expose provider details. */ }
    if (!payment) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "CONFIRM_FAILED";
      await supabase.rpc("record_payment_failure", { p_order_id: order.id, p_code: code, p_message: "Payment approval failed", p_cancelled: false });
      return safeError();
    }
  }
  if (!payment || !isConfirmedPayment(payment, order.id, order.total)) return safeError();

  const { data: result, error } = await supabase.rpc("finalize_paid_order", {
    p_order_id: order.id, p_payment_key: payment.paymentKey, p_amount: payment.totalAmount,
    p_method: payment.method ?? null, p_approved_at: payment.approvedAt ?? new Date().toISOString(),
  });
  if (error || !["paid", "already_paid"].includes(result)) {
    // Payment succeeded at Toss but inventory could not be committed. Compensate immediately.
    await cancelPayment(payment.paymentKey, "재고 부족으로 인한 자동 취소").catch(() => undefined);
    await supabase.rpc("record_payment_failure", { p_order_id: order.id, p_code: result ?? "FINALIZE_FAILED", p_message: "Payment automatically cancelled", p_cancelled: true });
    return NextResponse.json({ error: "재고가 소진되어 결제가 자동 취소되었습니다. 다른 상품을 선택해 주세요." }, { status: 409 });
  }
  return orderResponse(supabase, order.id);
}

async function orderResponse(supabase: ReturnType<typeof createServiceClient>, orderId: string) {
  const { data } = await supabase.from("orders")
    .select("id,order_number,total,fulfillment_type,payment_status,order_items(product_name,weight,grind,quantity,subtotal)")
    .eq("id", orderId).single();
  return NextResponse.json({ order: data });
}
