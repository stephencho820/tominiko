import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type OrderItemInput = { product?: { id?: unknown }; weight?: unknown; grind?: unknown; quantity?: unknown };
type OrderInput = {
  customerName?: unknown; email?: unknown; phone?: unknown; fulfillmentType?: unknown;
  postalCode?: unknown; address?: unknown; addressDetail?: unknown; deliveryMessage?: unknown;
  items?: unknown; idempotencyKey?: unknown; accessToken?: unknown;
};

const validWeights = new Set(["150g", "400g"]);
const validGrinds = new Set(["Whole Bean", "Filter", "Espresso"]);
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  let body: OrderInput;
  try { body = await request.json() as OrderInput; }
  catch { return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 }); }

  const items = Array.isArray(body.items) ? body.items as OrderItemInput[] : [];
  const fulfillmentType = text(body.fulfillmentType);
  const email = text(body.email);
  const idempotencyKey = text(body.idempotencyKey);
  const accessToken = text(body.accessToken);
  const invalidItem = items.some((item) => !text(item.product?.id) || !validWeights.has(text(item.weight)) ||
    !validGrinds.has(text(item.grind)) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 20);

  if (!text(body.customerName) || !email.includes("@") || !text(body.phone) ||
      !["delivery", "pickup"].includes(fulfillmentType) || !items.length || invalidItem ||
      !/^[0-9a-f-]{36}$/i.test(idempotencyKey) || accessToken.length < 32) {
    return NextResponse.json({ error: "주문 정보를 다시 확인해 주세요." }, { status: 400 });
  }
  if (fulfillmentType === "delivery" && (!text(body.postalCode) || !text(body.address))) {
    return NextResponse.json({ error: "배송 주소를 입력해 주세요." }, { status: 400 });
  }
  if (!hasSupabaseEnv || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY) {
    return NextResponse.json({ error: "결제 환경이 아직 설정되지 않았습니다." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_pending_order", {
    p_client_reference: idempotencyKey,
    p_guest_token_hash: tokenHash(accessToken),
    p_customer_name: text(body.customerName), p_email: email, p_phone: text(body.phone),
    p_fulfillment_type: fulfillmentType, p_postal_code: text(body.postalCode) || null,
    p_address: text(body.address) || null, p_address_detail: text(body.addressDetail) || null,
    p_delivery_message: text(body.deliveryMessage) || null,
    p_items: items.map((item) => ({ product_id: text(item.product?.id), weight: text(item.weight), grind: text(item.grind), quantity: Number(item.quantity) })),
  });

  if (error || !data?.[0]) {
    const unavailable = error?.message.includes("unavailable") || error?.message.includes("stock");
    return NextResponse.json({ error: unavailable ? "품절되었거나 구매할 수 없는 상품이 있습니다." : "주문을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: unavailable ? 409 : 400 });
  }
  const order = data[0];
  // An idempotent replay needs the original token. A different token cannot read the order.
  if (order.token_matches === false) return NextResponse.json({ error: "이미 처리된 주문 요청입니다. 결제 화면을 새로 열어 주세요." }, { status: 409 });

  return NextResponse.json({
    orderId: order.order_id, orderNumber: order.order_number, amount: order.total,
    orderName: order.order_name, accessToken, clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
  });
}
