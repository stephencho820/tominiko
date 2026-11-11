/**
 * Plain-text admin notification content. All values come from the saved order
 * and order_items rows, never from client-supplied totals or product snapshots.
 */
export type OrderEmailData = {
  id: string;
  order_number: string;
  created_at: string;
  order_source: string | null;
  table_label: string | null;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  delivery_method: string | null;
  shipping_zonecode: string | null;
  shipping_road_address: string | null;
  shipping_jibun_address: string | null;
  shipping_detail_address: string | null;
  shipping_building_name: string | null;
  shipping_memo_type: string | null;
  shipping_memo_text: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  delivery_message: string | null;
  product_subtotal: number | null;
  subtotal: number | null;
  discount_amount: number | null;
  shipping_fee: number | null;
  final_amount: number | null;
  total: number | null;
  payment_status: string | null;
  payment_method: string | null;
  order_status: string | null;
};

export type OrderEmailItem = {
  product_name: string | null;
  weight: string | null;
  grind: string | null;
  selected_option: string | null;
  item_kind: string | null;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
};

const first = (...values: (string | null | undefined)[]) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";

const singleLine = (value: string) => value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
const field = (value: string | null | undefined) => singleLine(value?.trim() || "") || "미입력";
const money = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value))
    ? "미확인"
    : "₩" + Number(value).toLocaleString("ko-KR");

const paymentLabels: Record<string, string> = {
  pending: "입금 / 결제 대기 (아직 결제 완료 아님)",
  paid: "결제 완료",
  failed: "결제 실패",
  cancelled: "결제 취소",
  refunded: "환불 완료",
};
const statusLabels: Record<string, string> = {
  new: "신규 접수",
  confirmed: "주문 확인",
  roasting: "로스팅 중",
  preparing: "상품 준비 중",
  ready_for_pickup: "픽업 준비 완료",
  shipped: "발송 / 배송 중",
  completed: "완료",
  cancelled: "취소",
};
const methodLabels: Record<string, string> = {
  shipping: "택배 배송",
  local_delivery: "광교 / 서광교 직접 배송",
  pickup: "매장 픽업",
};
const paymentMethodLabels: Record<string, string> = {
  BANK_TRANSFER: "계좌이체",
  CARD: "카드",
};

function itemText(item: OrderEmailItem, index: number) {
  const option = first(item.selected_option, [item.weight, item.grind].filter(Boolean).join(" / "));
  const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
  return [
    String(index + 1) + ". " + field(item.product_name),
    "   옵션: " + (option ? singleLine(option) : "기본 옵션"),
    "   수량: " + quantity + "개",
    "   단가: " + money(item.unit_price),
    "   상품금액: " + money(item.subtotal),
  ].join("\n");
}

export function formatAdminOrderEmail(
  order: OrderEmailData,
  items: OrderEmailItem[],
  adminUrl: string,
) {
  const isTasting = order.order_source === "tasting_room";
  const isPickup = order.delivery_method === "pickup";
  const recipient = first(order.recipient_name, order.customer_name);
  const recipientPhone = first(order.recipient_phone, order.phone);
  const zonecode = first(order.shipping_zonecode, order.postal_code);
  const road = first(order.shipping_road_address, order.address);
  const detail = first(order.shipping_detail_address, order.address_detail);
  const address = [zonecode && "[" + singleLine(zonecode) + "]", road, detail, order.shipping_building_name]
    .filter(Boolean).map((part) => singleLine(part as string)).join(" ");
  const memo = first(order.shipping_memo_text, order.delivery_message);
  const channel = isTasting ? "테이스팅룸" : "온라인 SHOP";
  const orderedAt = order.created_at
    ? new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(order.created_at))
    : "미확인";

  const lines = [
    "CASA DI STEFANO · 새 주문 알림",
    "========================================",
    "주문번호: " + field(order.order_number),
    "주문일시: " + orderedAt + " (한국시간)",
    "주문채널: " + channel,
    "수령방식: " + (methodLabels[order.delivery_method ?? ""] ?? field(order.delivery_method)),
    "",
    "■ 주문 상품 (" + items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) + "개)",
    "----------------------------------------",
    ...(items.length ? items.map((item, index) => itemText(item, index)) : ["주문 상품 정보를 확인할 수 없습니다. 관리자 화면에서 확인해 주세요."]),
    "",
    "■ 주문자 정보",
    "----------------------------------------",
    "이름: " + field(order.customer_name),
    "전화번호: " + field(order.phone),
    "이메일: " + field(order.email),
    "",
    "■ 배송 / 수령 정보",
    "----------------------------------------",
    "받는 분: " + field(recipient),
    "연락처: " + field(recipientPhone),
    ...(isPickup
      ? [
        "수령장소: " + (isTasting ? "테이스팅룸 현장 픽업" : "매장 픽업"),
        ...(order.table_label ? ["매장 주문 정보: " + singleLine(order.table_label)] : []),
        "배송주소: 해당 없음 (픽업)",
      ]
      : [
        "배송주소: " + (address || "주소 미입력"),
        ...(order.shipping_jibun_address ? ["지번주소: " + singleLine(order.shipping_jibun_address)] : []),
      ]),
    "배송 요청사항: " + (order.shipping_memo_type ? singleLine(order.shipping_memo_type) : "없음"),
    ...(memo ? ["상세 배송 메모: " + memo.split(/\r?\n/).map((line) => singleLine(line)).join("\n  ")] : []),
    "",
    "■ 결제 금액",
    "----------------------------------------",
    "상품금액: " + money(order.product_subtotal ?? order.subtotal),
    "할인: " + money(order.discount_amount ?? 0),
    "배송비: " + money(order.shipping_fee ?? 0),
    "최종 주문금액: " + money(order.final_amount ?? order.total),
    "",
    "■ 주문 / 결제 상태",
    "----------------------------------------",
    "결제수단: " + (paymentMethodLabels[order.payment_method ?? ""] ?? field(order.payment_method)),
    "결제상태: " + (paymentLabels[order.payment_status ?? ""] ?? field(order.payment_status)),
    "주문상태: " + (statusLabels[order.order_status ?? ""] ?? field(order.order_status)),
    "",
    "주문 상세 확인: " + adminUrl,
    "",
    "※ 이 메일은 관리자에게만 발송되는 주문 알림입니다.",
    "※ 입금 대기 주문은 실제 입금 확인 후 준비 / 발송해 주세요.",
  ];

  return {
    subject: "[CASA][" + channel + "] 새 주문 · " + field(order.order_number),
    text: lines.join("\n"),
  };
}
