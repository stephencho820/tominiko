import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { formatOrderTime } from "@/lib/admin";
import type { Order } from "@/types";

export default async function AdminOrders() {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*,order_items(*)").order("created_at", { ascending: false });
  const orders = (data ?? []) as Order[];
  const active = orders.filter((order) => !["completed", "cancelled"].includes(order.order_status));
  const closed = orders.filter((order) => ["completed", "cancelled"].includes(order.order_status));
  const renderOrder = (order: Order) => <article className="admin-order-card" key={order.id}><div className="admin-order-top"><div><Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link><span>{formatOrderTime(order.created_at)} · {order.customer_name}</span></div><StatusBadge type="payment" value={order.payment_status} /></div><div className="admin-order-items">{order.order_items?.map((item) => <span key={item.id}>{item.product_name} · {item.weight} · {item.grind} × {item.quantity}</span>)}</div><div className="admin-order-bottom"><div><StatusBadge type="order" value={order.order_status} /><span>{order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"} · ₩{order.total.toLocaleString()}</span></div><OrderStatusSelect id={order.id} initial={order.order_status} fulfillmentType={order.fulfillment_type} paymentStatus={order.payment_status} /></div></article>;
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Fulfillment</p><h1>Orders</h1><p>Paid and actionable orders stay at the top.</p></div><span className="admin-count">{active.length} open</span></div><section className="admin-work-queue"><div className="admin-section-heading"><div><p className="eyebrow">Open</p><h2>Work queue</h2></div></div><div className="admin-order-list">{active.map(renderOrder)}</div>{!active.length && <p className="admin-empty">No open orders.</p>}</section>{closed.length > 0 && <details className="admin-closed-orders"><summary>Completed & cancelled ({closed.length})</summary><div className="admin-order-list">{closed.map(renderOrder)}</div></details>}</main>;
}
