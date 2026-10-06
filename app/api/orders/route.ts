import { isSize, normalizeGrind, validVariantId } from "@/lib/product-contract";
import { NextResponse } from "next/server";
import { hashAccessToken } from "@/lib/order-access";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type OrderItemInput = { product?: { id?: unknown }; variantId?: unknown; weight?: unknown; grind?: unknown; quantity?: unknown };
type OrderInput = {
  customerName?: unknown; email?: unknown; phone?: unknown; fulfillmentType?: unknown;
  zonecode?: unknown; roadAddress?: unknown; jibunAddress?: unknown; detailAddress?: unknown; buildingName?: unknown; bname?: unknown;
  memoType?: unknown; memoText?: unknown;
  items?: unknown; idempotencyKey?: unknown; accessToken?: unknown;
};

const text = (value: unknown, maxLength = 500) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const within = (value: unknown, maxLength: number) => typeof value !== "string" || value.trim().length <= maxLength;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: OrderInput;
  try { body = await request.json() as OrderInput; }
  catch { return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 }); }

  const items = Array.isArray(body.items) ? body.items as OrderItemInput[] : [];
  const fulfillmentType = text(body.fulfillmentType);
  const email = text(body.email, 254).toLowerCase();
  const idempotencyKey = text(body.idempotencyKey);
  const accessToken = text(body.accessToken);
  const invalidItem = items.some((item) => !item || typeof item !== "object" || !uuidPattern.test(text(item.product?.id)) || !isSize(text(item.weight)) || !validVariantId(item.variantId) ||
    !normalizeGrind(item.grind) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 20);
  const quantities = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const productId = text(item.product?.id);
    quantities.set(productId + "::" + text(item.variantId), (quantities.get(productId + "::" + text(item.variantId)) ?? 0) + Number(item.quantity));
  }

  if (!text(body.customerName, 100) || (email && !/^\S+@\S+\.\S+$/.test(email)) || !/^01[016789]-?\d{3,4}-?\d{4}$/.test(text(body.phone, 30)) ||
      !["shipping", "local_delivery", "pickup"].includes(fulfillmentType) || !items.length || items.length > 20 || invalidItem ||
      [...quantities.values()].some((quantity) => quantity > 20) || !uuidPattern.test(idempotencyKey) ||
      accessToken.length < 32 || accessToken.length > 256 || !within(body.customerName, 100) || !within(body.email, 254) ||
      !within(body.phone, 30) || !within(body.zonecode, 20) || !within(body.roadAddress, 300) || !within(body.jibunAddress, 300) ||
      !within(body.detailAddress, 300) || !within(body.memoText, 500)) {
    return NextResponse.json({ error: "주문 정보를 다시 확인해 주세요." }, { status: 400 });
  }
  if (fulfillmentType !== "pickup" && (!text(body.zonecode) || !text(body.roadAddress) || !text(body.detailAddress))) {
    return NextResponse.json({ error: "배송 주소를 입력해 주세요." }, { status: 400 });
  }
  if (!hasSupabaseEnv || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY) {
    return NextResponse.json({ error: "결제 환경이 아직 설정되지 않았습니다." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_pending_order", {
    p_client_reference: idempotencyKey,
    p_guest_token_hash: hashAccessToken(accessToken),
    p_customer_name: text(body.customerName, 100), p_email: email, p_phone: text(body.phone, 30),
    p_delivery_method: fulfillmentType, p_zonecode: text(body.zonecode, 20) || null,
    p_road_address: text(body.roadAddress, 300) || null, p_jibun_address: text(body.jibunAddress, 300) || null,
    p_detail_address: text(body.detailAddress, 300) || null, p_building_name: text(body.buildingName, 200) || null,
    p_bname: text(body.bname, 100) || null, p_memo_type: text(body.memoType, 100) || null, p_memo_text: text(body.memoText, 500) || null,
    p_items: items.map((item) => ({ product_id: text(item.product?.id), variant_id: text(item.variantId), weight: text(item.weight), grind: normalizeGrind(item.grind), quantity: Number(item.quantity) })),
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
