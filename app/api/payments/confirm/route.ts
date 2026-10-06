import { validateVariants } from "@/lib/product-contract";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tokenMatches } from "@/lib/order-access";
import { cancelPayment, confirmPayment, getPayment, isConfirmedPayment } from "@/services/payment";
import { calculateCheckoutTotal, isLocalDeliveryEligible, settingsFromRow } from "@/lib/shipping";

const safeError = (status = 400) => NextResponse.json({ error: "결제를 확인하지 못했습니다. 결제 내역을 확인한 뒤 다시 시도해 주세요." }, { status });

export async function POST(request: Request) {
  let input: { paymentKey?: unknown; orderId?: unknown; amount?: unknown; accessToken?: unknown };
  try { input = await request.json(); } catch { return safeError(); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return safeError();
  const paymentKey = typeof input.paymentKey === "string" ? input.paymentKey : "";
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  const accessToken = typeof input.accessToken === "string" ? input.accessToken : "";
  if (!paymentKey || !orderId || !Number.isInteger(input.amount)) return safeError();

  const supabase = createServiceClient();
  const { data: order } = await supabase.from("orders")
    .select("id,order_number,total,payment_status,payment_key,guest_access_token_hash,delivery_method,shipping_zonecode,shipping_road_address,shipping_jibun_address,shipping_bname,discount_amount,order_items(product_id,variant_id,weight,quantity)")
    .eq("id", orderId).maybeSingle();
  if (!order || !tokenMatches(accessToken, order.guest_access_token_hash) || order.total !== input.amount) return safeError(403);

  // A paid replay must remain readable after stock, status or policy changes.
  if (order.payment_status === "paid") {
    return order.payment_key === paymentKey ? orderResponse(supabase, order.id) : safeError(409);
  }
  if (["cancelled", "refunded"].includes(order.payment_status)) return safeError(409);

  // An approval may already exist after an interrupted response or DB commit.
  // Recover its original amount before applying policy for a new approval.
  let payment;
  try {
    const existing = await getPayment(paymentKey);
    if (isConfirmedPayment(existing, order.id, order.total)) payment = existing;
  } catch { /* A new approval still requires canonical validation below. */ }
  if (!payment) {
    // Re-price from canonical products and current delivery policy immediately before approval.
    const productIds = order.order_items.map((item) => item.product_id).filter(Boolean);
    const [{ data: products, error: productsError }, { data: settingsRow, error: settingsError }, { data: zones, error: zonesError }] = await Promise.all([
      supabase.from("products").select("id,status,variants").in("id", productIds),
      supabase.from("delivery_settings").select("*").eq("id", true).single(),
      supabase.from("local_delivery_zones").select("zone_type,zone_value,enabled").eq("enabled", true),
    ]);
    if (productsError || settingsError || zonesError || !settingsRow) return safeError(503);
    const productMap = new Map((products ?? []).map((product) => [product.id, product]));
    let freshSubtotal = 0;
    const quantities = new Map<string, number>();
    for (const item of order.order_items) {
      const product = productMap.get(item.product_id ?? "");
      if (product?.status !== "active") return safeError(409);
      let variant;
      try { variant = validateVariants(product.variants).find((value) => value.id === item.variant_id && value.size === item.weight); }
      catch { return safeError(409); }
      if (!variant?.available) return safeError(409);
      const key = `${product.id}::${variant.id}`;
      const quantity = (quantities.get(key) ?? 0) + item.quantity;
      quantities.set(key, quantity);
      if (quantity > variant.stock) return safeError(409);
      freshSubtotal += (variant.salePrice ?? variant.price) * item.quantity;
    }
    if (order.delivery_method === "local_delivery" && !isLocalDeliveryEligible({ zonecode: order.shipping_zonecode, roadAddress: order.shipping_road_address, jibunAddress: order.shipping_jibun_address, bname: order.shipping_bname }, zones ?? [], Boolean(settingsRow?.local_delivery_enabled))) return safeError(409);
    const fresh = calculateCheckoutTotal(freshSubtotal, order.discount_amount ?? 0, order.delivery_method, settingsFromRow(settingsRow));
    if (fresh.finalAmount !== order.total || fresh.finalAmount !== input.amount) return NextResponse.json({ error: "상품 가격 또는 배송 정책이 변경되었습니다. 주문을 다시 확인해 주세요." }, { status: 409 });

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
  }
  if (!payment || !isConfirmedPayment(payment, order.id, order.total)) return safeError();

  const { data: result, error } = await supabase.rpc("finalize_paid_order", {
    p_order_id: order.id, p_payment_key: payment.paymentKey, p_amount: payment.totalAmount,
    p_method: payment.method ?? null, p_approved_at: payment.approvedAt ?? new Date().toISOString(),
  });
  if (error || !["paid", "already_paid"].includes(result)) {
    // Payment succeeded at Toss but inventory could not be committed. Compensate immediately.
    try { await cancelPayment(payment.paymentKey, "재고 부족으로 인한 자동 취소"); }
    catch {
      await supabase.rpc("record_payment_failure", { p_order_id: order.id, p_code: "CANCELLATION_FAILED", p_message: "Payment cancellation requires reconciliation", p_cancelled: false });
      return NextResponse.json({ error: "결제 취소를 확인하지 못했습니다. 결제 내역을 확인하고 고객센터에 문의해 주세요." }, { status: 502 });
    }
    await supabase.rpc("record_payment_failure", { p_order_id: order.id, p_code: result ?? "FINALIZE_FAILED", p_message: "Payment automatically cancelled", p_cancelled: true });
    return NextResponse.json({ error: "재고가 소진되어 결제가 자동 취소되었습니다. 다른 상품을 선택해 주세요." }, { status: 409 });
  }
  return orderResponse(supabase, order.id);
}

async function orderResponse(supabase: ReturnType<typeof createServiceClient>, orderId: string) {
  const { data } = await supabase.from("orders")
    .select("id,order_number,total,fulfillment_type,delivery_method,payment_status,order_items(product_name,weight,grind,quantity,subtotal)")
    .eq("id", orderId).single();
  if (!data || data.payment_status !== "paid") return safeError(503);
  return NextResponse.json({ order: data });
}
