import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { deliveryMethodLabels, orderStatusLabels, paymentStatusLabels, formatOrderTime } from "@/lib/admin";
import type { Order } from "@/types";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filter = (name: string) => typeof params[name] === "string" ? params[name] as string : "";
  const status = filter("status"), payment = filter("payment"), delivery = filter("delivery"), search = filter("q").trim().slice(0, 200);

  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id,order_number,created_at,customer_name,email,phone,payment_status,order_status,delivery_method,total,final_amount,order_items(id,product_name,weight,grind,quantity)").order("created_at", { ascending: false });
  const orders = ((data ?? []) as unknown as Order[]).filter((order) =>
    (!status || order.order_status === status) && (!payment || order.payment_status === payment) &&
    (!delivery || order.delivery_method === delivery) && (!search || [order.order_number, order.customer_name, order.email, order.phone].some((value) => value?.toLowerCase().includes(search.toLowerCase()))));
  const active = orders.filter((order) => !["completed", "cancelled"].includes(order.order_status));
  const closed = orders.filter((order) => ["completed", "cancelled"].includes(order.order_status));
  const renderOrder = (order: Order) => <article className="admin-order-card" key={order.id}><div className="admin-order-top"><div><Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link><span>{formatOrderTime(order.created_at)} · {order.customer_name}</span></div><StatusBadge type="payment" value={order.payment_status} /></div><div className="admin-order-items">{order.order_items?.map((item) => <span key={item.id}>{item.product_name} · {item.weight} · {item.grind} × {item.quantity}</span>)}</div><div className="admin-order-bottom"><div><StatusBadge type="order" value={order.order_status} deliveryMethod={order.delivery_method} /><span>{deliveryMethodLabels[order.delivery_method]} · ₩{(order.final_amount ?? order.total).toLocaleString()}</span></div><OrderStatusSelect id={order.id} initial={order.order_status} deliveryMethod={order.delivery_method} paymentStatus={order.payment_status} /></div></article>;
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Fulfillment</p><h1>Orders</h1><p>Paid and actionable orders stay at the top.</p></div><span className="admin-count">{active.length} open</span></div><form className="admin-panel" action="/admin/orders"><div className="admin-form-grid">
    <label className="admin-field">주문 상태<select name="status" defaultValue={status}><option value="">전체</option>{Object.entries(orderStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="admin-field">결제 상태<select name="payment" defaultValue={payment}><option value="">전체</option>{Object.entries(paymentStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="admin-field">배송 방식<select name="delivery" defaultValue={delivery}><option value="">전체</option>{Object.entries(deliveryMethodLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label className="admin-field">검색<input name="q" type="search" maxLength={200} defaultValue={search} placeholder="주문번호 / 고객명 / 이메일 / 전화번호" /></label>
    </div><button className="admin-primary-button" type="submit">필터 적용</button> <Link href="/admin/orders" className="admin-secondary-button">초기화</Link></form><section className="admin-work-queue"><div className="admin-section-heading"><div><p className="eyebrow">Open</p><h2>Work queue</h2></div></div><div className="admin-order-list">{active.map(renderOrder)}</div>{!active.length && <p className="admin-empty">No open orders.</p>}</section>{closed.length > 0 && <details className="admin-closed-orders" open={Boolean(status || payment || delivery || search)}><summary>Completed & cancelled ({closed.length})</summary><div className="admin-order-list">{closed.map(renderOrder)}</div></details>}</main>;
}
