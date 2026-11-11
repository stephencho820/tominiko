import Link from "next/link";
import { ArrowRight, ClipboardList, PackagePlus, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deliveryMethodLabels, formatOrderTime, seoulTodayRange } from "@/lib/admin";
import { inventoryVariants } from "@/lib/products";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import type { Order, Product } from "@/types";

const LOW_STOCK_THRESHOLD = 5;

function lowStockSizes(product: Product) {
  return inventoryVariants(product)
    .filter((variant) => !variant.available || variant.stock <= LOW_STOCK_THRESHOLD)
    .map((variant) => variant.size);
}

export default async function Admin() {
  const supabase = await createClient();
  const { start, end } = seoulTodayRange();
  const [
    { data: productsData },
    { data: ordersData },
    { count: todayOrderCount },
    { data: paidSales },
    { count: waitingCount },
  ] = await Promise.all([
    supabase.from("products").select("*").order("display_order"),
    supabase.from("orders").select("*,order_items(*)")
      .not("order_status", "in", "(completed,cancelled)")
      .order("created_at", { ascending: false }).limit(6),
    supabase.from("orders").select("id", { count: "exact", head: true })
      .gte("created_at", start).lt("created_at", end),
    supabase.from("orders").select("total,final_amount")
      .eq("payment_status", "paid")
      .gte("created_at", start).lt("created_at", end),
    supabase.from("orders").select("id", { count: "exact", head: true })
      .in("order_status", ["new", "confirmed"]),
  ]);

  const products = (productsData ?? []) as Product[];
  const orders = (ordersData ?? []) as Order[];
  const activeProducts = products.filter((item) => item.status === "active");
  const lowStock = activeProducts.filter((item) => lowStockSizes(item).length > 0);
  const todayCoffee = activeProducts.find((item) => item.todays_roast);
  const todayRevenue = (paidSales ?? []).reduce(
    (sum, order) => sum + Number(order.final_amount ?? order.total ?? 0), 0
  );
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  }).format(new Date());

  return (
    <main className="admin-main admin-dashboard">
      <div className="admin-overview-intro">
        <div>
          <p className="eyebrow">OPERATIONS OVERVIEW</p>
          <h1>운영 대시보드</h1>
          <p>{todayLabel} · 오늘 확인할 내용만 모았습니다.</p>
        </div>
        <Link href="/admin/products/new" className="admin-primary-button">+ 상품 등록</Link>
      </div>

      <section className="admin-overview-kpis" aria-label="운영 핵심 지표">
        <article className="admin-overview-kpi">
          <span>오늘 결제 매출</span>
          <strong>₩{todayRevenue.toLocaleString("ko-KR")}</strong>
          <small>오늘 결제 완료 기준</small>
        </article>
        <article className="admin-overview-kpi">
          <span>오늘 접수 주문</span>
          <strong>{todayOrderCount ?? 0}건</strong>
          <small>온라인 · 매장 포함</small>
        </article>
        <article className={"admin-overview-kpi" + (waitingCount ? " is-alert" : "")}>
          <span>신규 / 확인 대기</span>
          <strong>{waitingCount ?? 0}건</strong>
          <small>전체 미처리 주문 상태 기준</small>
        </article>
        <article className={"admin-overview-kpi" + (lowStock.length ? " is-alert" : "")}>
          <span>재고 확인</span>
          <strong>{lowStock.length}개 상품</strong>
          <small>활성 상품 · 용량별 5개 이하</small>
        </article>
      </section>

      <section className="admin-overview-shortcuts" aria-label="빠른 관리">
        <Link href="/admin/orders" className="admin-overview-shortcut">
          <span><strong>온라인 주문 확인</strong><small>입금 · 배송 · 주문 상태</small></span>
          <ClipboardList size={21} aria-hidden="true" />
        </Link>
        <Link href="/admin/products" className="admin-overview-shortcut">
          <span><strong>상품 / 재고 수정</strong><small>가격 · 수량 · 공개 상태</small></span>
          <PackagePlus size={21} aria-hidden="true" />
        </Link>
        <Link href="/admin/tasting-orders" className="admin-overview-shortcut">
          <span><strong>테이스팅룸 주문</strong><small>매장 주문 접수 및 처리</small></span>
          <Store size={21} aria-hidden="true" />
        </Link>
      </section>

      <div className="admin-overview-columns">
        <section className="admin-overview-panel" aria-labelledby="admin-orders-title">
          <div className="admin-overview-panel-header">
            <h2 id="admin-orders-title">진행 중인 주문</h2>
            <Link href="/admin/orders">전체 주문 <ArrowRight size={14} style={{ display: "inline" }} /></Link>
          </div>
          {orders.length ? orders.map((order) => (
            <article className="admin-overview-order" key={order.id}>
              <div>
                <Link href={"/admin/orders/" + order.id}>
                  {order.customer_name || "고객"} · {order.order_number}
                </Link>
                <p>{formatOrderTime(order.created_at)} · {deliveryMethodLabels[order.delivery_method] ?? "주문"}</p>
              </div>
              <strong>₩{(order.final_amount ?? order.total).toLocaleString("ko-KR")}</strong>
              <div className="admin-overview-order-actions">
                <StatusBadge type="payment" value={order.payment_status} />
                <StatusBadge type="order" value={order.order_status} deliveryMethod={order.delivery_method} />
                <OrderStatusSelect
                  id={order.id}
                  initial={order.order_status}
                  deliveryMethod={order.delivery_method}
                  paymentStatus={order.payment_status}
                />
              </div>
            </article>
          )) : (
            <p className="admin-overview-empty">현재 진행 중인 주문이 없습니다.</p>
          )}
        </section>

        <div className="admin-overview-side">
          <section className="admin-overview-panel" aria-labelledby="admin-stock-title">
            <div className="admin-overview-panel-header">
              <h2 id="admin-stock-title">재고 확인</h2>
              <Link href="/admin/products">상품 관리 <ArrowRight size={14} style={{ display: "inline" }} /></Link>
            </div>
            {lowStock.length ? lowStock.slice(0, 5).map((product) => (
              <div className="admin-overview-stock" key={product.id}>
                <Link href={"/admin/products/" + product.id}>{product.korean_name || product.name}</Link>
                <small>{lowStockSizes(product).join(" · ")} 확인</small>
              </div>
            )) : (
              <p className="admin-overview-empty">현재 확인이 필요한 재고가 없습니다.</p>
            )}
            {lowStock.length > 5 && (
              <p className="admin-panel-help">외 {lowStock.length - 5}개 상품 · 상품 관리에서 확인하세요.</p>
            )}
          </section>
          <section className="admin-overview-panel" aria-labelledby="admin-coffee-title">
            <div className="admin-overview-panel-header">
              <h2 id="admin-coffee-title">오늘의 커피</h2>
              <Link href="/admin/products">변경하기 <ArrowRight size={14} style={{ display: "inline" }} /></Link>
            </div>
            <div className="admin-overview-coffee">
              {todayCoffee ? (
                <>
                  <strong>{todayCoffee.korean_name || todayCoffee.name}</strong>
                  <p>{todayCoffee.tasting_notes || todayCoffee.origin}</p>
                  <p>{inventoryVariants(todayCoffee).map((variant) =>
                    variant.size + " " + variant.stock + "개").join(" · ")}</p>
                </>
              ) : (
                <p>설정된 커피가 없습니다. 상품 관리에서 선택할 수 있습니다.</p>
              )}
            </div>
          </section>
          <Link href="/admin/roasting" className="admin-overview-shortcut">
            <span><strong>로스팅 준비 목록</strong><small>결제 완료 주문의 포장 수량 확인</small></span>
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
