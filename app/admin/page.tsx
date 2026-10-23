import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deliveryMethodLabels, formatOrderTime, seoulTodayRange } from "@/lib/admin";
import { inventoryVariants, productImage } from "@/lib/products";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { AdminSetTodayCoffeeButton } from "@/components/AdminSetTodayCoffeeButton";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import type { Order, Product } from "@/types";

const LOW_VARIANT_STOCK = 5;

function stockFor(product: Product, size: "150g" | "400g") {
  return inventoryVariants(product).find((variant) => variant.size === size)?.stock ?? 0;
}

function isLowStock(product: Product) {
  const variants = inventoryVariants(product);
  return variants.some((variant) => variant.stock <= LOW_VARIANT_STOCK || !variant.available);
}

export default async function Admin() {
  const supabase = await createClient();
  const { start, end } = seoulTodayRange();
  const [{ data: productsData }, { data: ordersData }, { count: todayCount }, { data: todaySales }, { count: paidCount }] = await Promise.all([
    supabase.from("products").select("*").order("display_order"),
    supabase.from("orders").select("*,order_items(*)").not("order_status", "in", "(completed,cancelled)").order("created_at", { ascending: false }).limit(8),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
    supabase.from("orders").select("total,final_amount").eq("payment_status", "paid").gte("created_at", start).lt("created_at", end),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "paid").gte("created_at", start).lt("created_at", end),
  ]);

  const products = (productsData ?? []) as Product[];
  const orders = (ordersData ?? []) as Order[];
  const activeProducts = products.filter((product) => product.status === "active");
  const todaysCoffee = activeProducts.find((product) => product.todays_roast);
  const lowStock = activeProducts.filter(isLowStock);
  const todayRevenue = (todaySales ?? []).reduce((sum, order) => sum + Number(order.final_amount ?? order.total ?? 0), 0);
  const newOrders = orders.filter((order) => ["new", "confirmed"].includes(order.order_status)).length;
  const preparing = orders.filter((order) => ["roasting", "preparing"].includes(order.order_status)).length;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPaidOrders } = await supabase.from("orders")
    .select("id,user_id,email,total,final_amount")
    .eq("payment_status", "paid")
    .gte("created_at", thirtyDaysAgo)
    .limit(1000);
  const recentSales = recentPaidOrders ?? [];
  const recentRevenue = recentSales.reduce((sum, order) => sum + Number(order.final_amount ?? order.total ?? 0), 0);
  const customers = new Map<string, number>();
  for (const order of recentSales) {
    const key = order.user_id || order.email?.trim().toLowerCase();
    if (key) customers.set(key, (customers.get(key) ?? 0) + 1);
  }
  const returningCustomers = [...customers.values()].filter(count => count > 1).length;
  const averageOrderValue = recentSales.length ? Math.round(recentRevenue / recentSales.length) : 0;
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short",
  }).format(new Date());

  return <main className="admin-main admin-dashboard">
    <header className="admin-dashboard-heading">
      <div>
        <p className="eyebrow">ROASTERY OPERATIONS</p>
        <h1>Dashboard</h1>
        <p>{todayLabel}</p>
      </div>
      <div className="flex flex-wrap gap-3"><Link href="/admin/roasting" className="admin-dashboard-primary-link">로스팅 준비 현황 →</Link><div className="flex flex-wrap gap-3"><Link href="/admin/subscriptions" className="admin-dashboard-primary-link">구독 관리 →</Link><Link href="/admin/vip" className="admin-dashboard-primary-link">VIP 관리 →</Link><Link href="/admin/orders" className="admin-dashboard-primary-link">주문 전체 보기 →</Link></div></div>
    </header>

    <section className="admin-kpis" aria-label="오늘 운영 현황">
      <article><span>오늘 결제 매출</span><strong>₩{todayRevenue.toLocaleString("ko-KR")}</strong><small>오늘 결제 완료 주문 합계 · 환불 별도</small></article>
      <article><span>오늘 결제 완료</span><strong>{paidCount ?? 0}</strong><small>결제 완료 주문 수</small></article>
      <article><span>오늘 주문</span><strong>{todayCount ?? 0}</strong><small>오늘 접수된 주문</small></article>
      <article className={newOrders ? "needs-attention" : ""}><span>처리 필요</span><strong>{newOrders}</strong><small>신규 · 확인 대기</small></article>
      <article><span>준비 중</span><strong>{preparing}</strong><small>로스팅 · 포장 중</small></article>
      <article className={lowStock.length ? "needs-attention" : ""}><span>재고 부족</span><strong>{lowStock.length}</strong><small>{lowStock.length ? "확인이 필요한 상품" : "모든 재고 정상"}</small></article>
    </section>

    <section className="mb-10" aria-label="최근 30일 고객 및 매출 분석">
      <div className="admin-section-heading"><div><p className="eyebrow">CUSTOMER INSIGHTS</p><h2>최근 30일</h2></div></div>
      <div className="admin-kpis">
        <article><span>결제 매출</span><strong>₩{recentRevenue.toLocaleString("ko-KR")}</strong><small>최근 30일 결제 완료</small></article>
        <article><span>평균 주문 금액</span><strong>₩{averageOrderValue.toLocaleString("ko-KR")}</strong><small>결제 완료 주문 기준</small></article>
        <article><span>재구매 고객</span><strong>{returningCustomers}</strong><small>최근 30일 2회 이상 구매 · 이메일/회원 ID 기준</small></article>
      </div>
      {recentSales.length === 1000 && <p className="mt-2 text-xs text-[var(--muted)]">최근 1,000건 기준으로 계산한 값입니다.</p>}
    </section>
    <section className="admin-today-card" aria-labelledby="today-coffee-title">
      <div className="admin-today-copy">
        <p className="eyebrow">TODAY'S COFFEE</p>
        {todaysCoffee ? <>
          <h2 id="today-coffee-title">{todaysCoffee.name}</h2>
          <p className="admin-today-notes">{todaysCoffee.tasting_notes || todaysCoffee.description || todaysCoffee.origin}</p>
          <div className="admin-today-meta">
            <span>{todaysCoffee.origin}</span>
            {todaysCoffee.process && <span>{todaysCoffee.process}</span>}
            <span>Roasted {todaysCoffee.roasted_date || "날짜 미설정"}</span>
          </div>
          <div className="admin-size-stock">
            <span><b>150g</b>{stockFor(todaysCoffee, "150g")}개</span>
            <span><b>400g</b>{stockFor(todaysCoffee, "400g")}개</span>
          </div>
          <div className="admin-today-links">
            <Link href={`/admin/products/${todaysCoffee.id}`}>상품 편집 →</Link>
            <a href="#coffee-inventory">다른 커피 선택 ↓</a>
          </div>
        </> : <>
          <h2 id="today-coffee-title">오늘의 커피가 선택되지 않았어요.</h2>
          <p className="admin-today-notes">아래 Coffee Inventory에서 하나를 선택하면 홈의 Find your coffee 추천에도 반영됩니다.</p>
          <a href="#coffee-inventory" className="admin-inline-link">선택하러 가기 ↓</a>
        </>}
      </div>
      <div className="admin-today-visual">
        {todaysCoffee ? <img src={productImage(todaysCoffee)} alt="" /> : <span>CASA</span>}
      </div>
    </section>

    <section className="admin-inventory" id="coffee-inventory" aria-labelledby="coffee-inventory-title">
      <div className="admin-section-heading admin-inventory-heading">
        <div>
          <p className="eyebrow">COFFEE INVENTORY</p>
          <h2 id="coffee-inventory-title">{products.length} coffees</h2>
        </div>
        <Link href="/admin/products">상세 상품 관리 →</Link>
      </div>

      <div className="admin-inventory-table">
        <div className="admin-inventory-head" aria-hidden="true">
          <span>상품</span><span>상태</span><span>150g</span><span>400g</span><span>오늘의 커피</span><span />
        </div>
        {products.map((product) => {
          const stock150 = stockFor(product, "150g");
          const stock400 = stockFor(product, "400g");
          const productLow = product.status === "active" && (stock150 <= LOW_VARIANT_STOCK || stock400 <= LOW_VARIANT_STOCK);
          return <article className={`admin-inventory-row ${productLow ? "is-low" : ""}`} key={product.id}>
            <div className="admin-inventory-product">
              <img src={productImage(product)} alt="" />
              <div><strong>{product.name}</strong><small>{product.origin}{product.tasting_notes ? ` · ${product.tasting_notes}` : ""}</small></div>
            </div>
            <div className="admin-inventory-status">
              <span className={`admin-state admin-state-${product.status || "active"}`}>{product.status || "active"}</span>
            </div>
            <div className="admin-inventory-stock"><small>150g</small><strong>{stock150}</strong><span>개</span></div>
            <div className="admin-inventory-stock"><small>400g</small><strong>{stock400}</strong><span>개</span></div>
            <AdminSetTodayCoffeeButton id={product.id} current={Boolean(product.todays_roast)} />
            <Link href={`/admin/products/${product.id}`} className="admin-row-edit">Edit →</Link>
          </article>;
        })}
      </div>
    </section>

    <section className="admin-work-queue">
      <div className="admin-section-heading">
        <div><p className="eyebrow">ORDERS</p><h2>주문 처리</h2></div>
        {orders.length > 0 && <Link href="/admin/orders">전체 주문 →</Link>}
      </div>
      {orders.length ? <div className="admin-order-list">{orders.map((order) => <article className="admin-order-card" key={order.id}>
        <div className="admin-order-top"><div><Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link><span>{formatOrderTime(order.created_at)} · {order.customer_name}</span></div><StatusBadge type="payment" value={order.payment_status} /></div>
        <div className="admin-order-items">{order.order_items?.map((item) => <span key={item.id}>{item.product_name} · {item.weight} · {item.grind} × {item.quantity}</span>)}</div>
        <div className="admin-order-bottom"><div><StatusBadge type="order" value={order.order_status} deliveryMethod={order.delivery_method} /><span>{deliveryMethodLabels[order.delivery_method]} · ₩{(order.final_amount ?? order.total).toLocaleString()}</span></div><OrderStatusSelect id={order.id} initial={order.order_status} deliveryMethod={order.delivery_method} paymentStatus={order.payment_status} /></div>
      </article>)}</div> : <div className="admin-orders-empty"><strong>처리할 주문이 없습니다.</strong><span>새 주문이 들어오면 여기에 바로 표시됩니다.</span></div>}
    </section>
  </main>;
}
