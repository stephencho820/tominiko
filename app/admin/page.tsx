import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LOW_STOCK_THRESHOLD, formatOrderTime, seoulTodayRange } from "@/lib/admin";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { ProductQuickActions } from "@/components/ProductQuickActions";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import type { Order, Product } from "@/types";

export default async function Admin() {
  const supabase = await createClient();
  const { start, end } = seoulTodayRange();
  const [{ data: productsData }, { data: ordersData }, { count: todayCount }] = await Promise.all([
    supabase.from("products").select("*").order("display_order"),
    supabase.from("orders").select("*,order_items(*)").not("order_status", "in", "(completed,cancelled)").order("created_at", { ascending: false }).limit(8),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
  ]);
  const products = (productsData ?? []) as Product[];
  const orders = (ordersData ?? []) as Order[];
  const roast = products.find((product) => product.todays_roast);
  const lowStock = products.filter((product) => product.active && product.stock_quantity <= LOW_STOCK_THRESHOLD);
  const newOrders = orders.filter((order) => ["new", "confirmed"].includes(order.order_status)).length;
  const preparing = orders.filter((order) => ["roasting", "preparing"].includes(order.order_status)).length;
  const ready = orders.filter((order) => order.order_status === "ready_for_pickup").length;
  const shipping = orders.filter((order) => order.order_status === "shipped").length;

  return (
    <main className="admin-main">
      <div className="admin-page-heading"><div><p className="eyebrow">Daily operations</p><h1>Today</h1><p>{new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p></div><Link href="/admin/orders" className="admin-text-link">All orders →</Link></div>
      <section className="admin-pulse" aria-label="Today at a glance">
        <div><span>Orders today</span><strong>{todayCount ?? 0}</strong></div><div><span>New</span><strong>{newOrders}</strong></div><div><span>Preparing</span><strong>{preparing}</strong></div><div><span>Pickup ready</span><strong>{ready}</strong></div><div><span>Shipped</span><strong>{shipping}</strong></div><div className={lowStock.length ? "needs-attention" : ""}><span>Low / sold out</span><strong>{lowStock.length}</strong></div>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-roast-panel">
          <div className="admin-section-heading"><div><p className="eyebrow">Today’s roast</p><h2>{roast?.name ?? "Not selected"}</h2></div><Link href="/admin/products">View products →</Link></div>
          {roast ? <><p className="admin-muted">{roast.origin}{roast.process ? ` · ${roast.process}` : ""} · Roasted {roast.roasted_date ?? "date not set"}</p><ProductQuickActions id={roast.id} name={roast.name} stock={roast.stock_quantity} active={roast.active} todaysRoast={roast.todays_roast} compact /></> : <p className="admin-empty">Choose an active, stocked coffee below.</p>}
          <div className="admin-roast-options" aria-label="Change today's roast">{products.filter((product) => product.active && product.stock_quantity > 0 && !product.todays_roast).slice(0, 4).map((product) => <div key={product.id}><span>{product.name}</span><ProductQuickActions id={product.id} name={product.name} stock={product.stock_quantity} active={product.active} todaysRoast={false} compact /></div>)}</div>
        </section>
        <section className="admin-panel">
          <div className="admin-section-heading"><div><p className="eyebrow">Inventory attention</p><h2>{lowStock.length ? `${lowStock.length} coffees need attention` : "Stock looks good"}</h2></div><Link href="/admin/products">Inventory →</Link></div>
          <div className="admin-attention-list">{lowStock.map((product) => <div key={product.id}><div><strong>{product.name}</strong><span className={product.stock_quantity === 0 ? "is-danger" : "is-warning"}>{product.stock_quantity === 0 ? "Sold out" : `${product.stock_quantity} left`}</span></div><ProductQuickActions id={product.id} name={product.name} stock={product.stock_quantity} active={product.active} todaysRoast={product.todays_roast} compact /></div>)}</div>
        </section>
      </div>

      <section className="admin-work-queue">
        <div className="admin-section-heading"><div><p className="eyebrow">Work queue</p><h2>What needs doing</h2></div></div>
        {orders.length ? <div className="admin-order-list">{orders.map((order) => <article className="admin-order-card" key={order.id}><div className="admin-order-top"><div><Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link><span>{formatOrderTime(order.created_at)} · {order.customer_name}</span></div><StatusBadge type="payment" value={order.payment_status} /></div><div className="admin-order-items">{order.order_items?.map((item) => <span key={item.id}>{item.product_name} · {item.weight} · {item.grind} × {item.quantity}</span>)}</div><div className="admin-order-bottom"><div><StatusBadge type="order" value={order.order_status} /><span>{order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"} · ₩{order.total.toLocaleString()}</span></div><OrderStatusSelect id={order.id} initial={order.order_status} fulfillmentType={order.fulfillment_type} paymentStatus={order.payment_status} /></div></article>)}</div> : <p className="admin-empty">No open orders. You’re caught up.</p>}
      </section>
    </main>
  );
}
