import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { deliveryMethodLabels, formatOrderTime } from "@/lib/admin";

const money = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient(); const id = (await params).id;
  // Select only operational fields; never send payment keys or access token hashes to the UI.
  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("id,order_number,created_at,customer_name,email,phone,delivery_method,recipient_name,recipient_phone,shipping_zonecode,shipping_road_address,shipping_jibun_address,shipping_detail_address,shipping_building_name,shipping_memo_type,shipping_memo_text,postal_code,address,address_detail,delivery_message,product_subtotal,discount_amount,shipping_fee,final_amount,subtotal,total,payment_status,payment_method,payment_approved_at,payment_failure_code,payment_failure_message,order_status").eq("id", id).single(),
    supabase.from("order_items").select("id,product_name,weight,grind,quantity,subtotal").eq("order_id", id),
  ]);
  if (!order) notFound();
  const recipient = order.recipient_name || order.customer_name;
  const phone = order.recipient_phone || order.phone;
  const zonecode = order.shipping_zonecode || order.postal_code;
  const road = order.shipping_road_address || order.address;
  const detail = order.shipping_detail_address || order.address_detail;
  const memo = order.shipping_memo_text || order.delivery_message;
  return <main className="admin-main admin-detail">
    <Link href="/admin/orders" className="admin-back">← Orders</Link>
    <div className="admin-page-heading"><div><p className="eyebrow">Order detail</p><h1>{order.order_number}</h1><p>{formatOrderTime(order.created_at)}</p></div><div className="admin-detail-status"><StatusBadge type="payment" value={order.payment_status} /><StatusBadge type="order" value={order.order_status} deliveryMethod={order.delivery_method} /></div></div>
    {order.payment_status !== "paid" && <div className="admin-payment-warning"><strong>Payment not completed</strong><span>Do not roast, prepare, or dispatch this order until payment is confirmed.</span></div>}
    <div className="admin-detail-grid">
      <section className="admin-panel"><p className="eyebrow">Customer & fulfillment</p><h2>{order.customer_name}</h2><p>{order.email}<br />{order.phone}</p><hr />
        <p className="eyebrow">{deliveryMethodLabels[order.delivery_method as keyof typeof deliveryMethodLabels]}</p>
        <p>수령인: {recipient}<br />연락처: {phone}</p>
        {order.delivery_method === "pickup" ? <p>매장 픽업</p> : <>
          <p>{[zonecode, road, detail, order.shipping_building_name].filter(Boolean).join(" ")}</p>
          {order.shipping_jibun_address && <p>지번 주소: {order.shipping_jibun_address}</p>}
        </>}
        {order.shipping_memo_type && <p>배송 메모: {order.shipping_memo_type}</p>}
        {memo && <p className="admin-note">“{memo}”</p>}
        <hr /><p className="eyebrow">결제 정보</p><p>{order.payment_status}</p>
        {order.payment_method && <p>결제 수단: {order.payment_method}</p>}
        {order.payment_approved_at && <p>승인 일시: {formatOrderTime(order.payment_approved_at)}</p>}
        {order.payment_status !== "paid" && (order.payment_failure_code || order.payment_failure_message) && <>
          {order.payment_failure_code && <p>실패 코드: {order.payment_failure_code}</p>}
          {order.payment_failure_message && <p className="admin-note">{order.payment_failure_message}</p>}
        </>}
      </section>
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Items</p><h2>Prepare order</h2></div></div>
        <div className="admin-detail-items">{(items ?? []).map((item) => <div key={item.id}><span><strong>{item.product_name}</strong><small>{item.weight} · {item.grind} · Qty {item.quantity}</small></span><span>{money(item.subtotal)}</span></div>)}</div>
        <div className="admin-total"><span>상품금액</span><strong>{money(order.product_subtotal ?? order.subtotal)}</strong></div>
        <div className="admin-total"><span>할인</span><strong>{money(order.discount_amount ?? 0)}</strong></div>
        <div className="admin-total"><span>배송비</span><strong>{money(order.shipping_fee ?? 0)}</strong></div>
        <div className="admin-total"><span>최종 결제금액</span><strong>{money(order.final_amount ?? order.total)}</strong></div>
        <div className="admin-detail-actions"><OrderStatusSelect id={order.id} initial={order.order_status} deliveryMethod={order.delivery_method} paymentStatus={order.payment_status} /><OrderStatusSelect id={order.id} initial={order.order_status} deliveryMethod={order.delivery_method} paymentStatus={order.payment_status} mode="select" /></div>
      </section>
    </div>
  </main>;
}
