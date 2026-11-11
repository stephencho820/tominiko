import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusSelect } from "@/components/OrderStatusSelect";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { deliveryMethodLabels, orderStatusLabels, paymentStatusLabels, formatOrderTime } from "@/lib/admin";
import type { Order } from "@/types";

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = (name: string) => typeof params[name] === "string" ? params[name] as string : "";
  const status = filter("status");
  const payment = filter("payment");
  const delivery = filter("delivery");
  const search = filter("q").trim().slice(0, 200);

  const supabase = await createClient();
  const { data } = await supabase.from("orders")
    .select("id,order_number,created_at,customer_name,email,phone,payment_status,payment_method,order_status,delivery_method,order_source,table_label,total,final_amount,order_items(id,product_name,weight,grind,selected_option,item_kind,quantity)")
    .order("created_at", { ascending: false });

  const orders = ((data ?? []) as unknown as Order[]).filter((order) =>
    (!status || order.order_status === status)
    && (!payment || order.payment_status === payment)
    && (!delivery || order.delivery_method === delivery)
    && (!search || [order.order_number, order.customer_name, order.email, order.phone]
      .some((value) => value?.toLowerCase().includes(search.toLowerCase())))
  );
  const active = orders.filter((order) => !["completed", "cancelled"].includes(order.order_status));
  const closed = orders.filter((order) => ["completed", "cancelled"].includes(order.order_status));
  const pending = active.filter((order) => order.payment_status === "pending");
  const other = active.filter((order) => order.payment_status !== "pending");

  function renderOrder(order: Order) {
    return (
      <article className="admin-order-card" key={order.id}>
        <div className="admin-order-top">
          <div>
            <Link href={"/admin/orders/" + order.id} className="admin-order-customer">
              {order.customer_name || "이름 미입력"}
            </Link>
            {order.phone && (
              <a
                className="admin-phone-link"
                href={"tel:" + order.phone.replace(/[^\d+]/g, "")}
                aria-label={(order.customer_name || "고객") + " 전화하기"}
              >
                {order.phone}
              </a>
            )}
            <span>{formatOrderTime(order.created_at)} · {order.order_number}
              {order.order_source === "tasting_room" ? " · 테이스팅룸" : ""}
            </span>
          </div>
          <div>
            <StatusBadge type="payment" value={order.payment_status} />
            {order.payment_method === "BANK_TRANSFER" && order.payment_status === "pending" && (
              <span className="admin-count">계좌이체 입금 대기</span>
            )}
          </div>
        </div>
        <div className="admin-order-items">
          {order.order_items?.map((item) => (
            <span key={item.id}>
              {item.product_name} · {item.selected_option || item.weight + " · " + item.grind} × {item.quantity}
            </span>
          ))}
        </div>
        <div className="admin-order-bottom">
          <div>
            <StatusBadge type="order" value={order.order_status} deliveryMethod={order.delivery_method} />
            <span>{deliveryMethodLabels[order.delivery_method]} · ₩{(order.final_amount ?? order.total).toLocaleString("ko-KR")}</span>
          </div>
          <div className="admin-order-page-actions">
            <OrderStatusSelect
              id={order.id}
              initial={order.order_status}
              deliveryMethod={order.delivery_method}
              paymentStatus={order.payment_status}
            />
            <Link href={"/admin/orders/" + order.id} className="admin-secondary-button">
              상세 보기
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="admin-main">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">ORDERS</p>
          <h1>온라인 주문 관리</h1>
          <p>접수된 주문을 확인하고 입금·배송 상태를 관리하세요.</p>
        </div>
        <span className="admin-count">{active.length}건 진행 중</span>
      </div>

      <form className="admin-panel admin-order-filters" action="/admin/orders">
        <div className="admin-order-searchbar">
          <label className="admin-field">
            주문 검색
            <input
              name="q"
              type="search"
              maxLength={200}
              defaultValue={search}
              placeholder="주문번호 · 고객 이름 · 전화번호 · 이메일"
            />
          </label>
          <button className="admin-primary-button" type="submit">검색</button>
          <Link href="/admin/orders" className="admin-secondary-button">초기화</Link>
        </div>
        <details className="admin-order-filter-more" open={Boolean(status || payment || delivery)}>
          <summary>상태 · 결제 · 배송 필터</summary>
          <div className="admin-form-grid">
            <label className="admin-field">
              주문 상태
              <select name="status" defaultValue={status}>
                <option value="">전체</option>
                {Object.entries(orderStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              결제 상태
              <select name="payment" defaultValue={payment}>
                <option value="">전체</option>
                {Object.entries(paymentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              배송 방식
              <select name="delivery" defaultValue={delivery}>
                <option value="">전체</option>
                {Object.entries(deliveryMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="admin-secondary-button" type="submit">필터 적용</button>
        </details>
      </form>

      <section className="admin-work-queue">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">ACTIVE ORDERS</p>
            <h2>처리할 주문 ({active.length})</h2>
          </div>
        </div>
        <div className="admin-order-list">
          {pending.map(renderOrder)}
          {pending.length > 0 && other.length > 0 && (
            <h3 className="admin-queue-divider">입금 대기 외 진행 주문</h3>
          )}
          {other.map(renderOrder)}
        </div>
        {!active.length && <div className="admin-orders-empty"><strong>진행 중인 주문이 없습니다.</strong></div>}
      </section>
      {closed.length > 0 && (
        <details className="admin-closed-orders" open={Boolean(status || payment || delivery || search)}>
          <summary>완료 · 취소 주문 ({closed.length})</summary>
          <div className="admin-order-list">{closed.map(renderOrder)}</div>
        </details>
      )}
    </main>
  );
}
