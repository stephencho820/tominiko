import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getMyOrders } from "@/services/orders";
import { deliveryMethodLabels } from "@/lib/admin";
import type { Order } from "@/types";
import { ReorderButton, type ReorderLine } from "@/components/ReorderButton";

export const metadata = { title: "My Orders" };

const orderStatusLabels: Record<string, string> = {
  new: "주문 접수",
  confirmed: "주문 확인",
  roasting: "로스팅 중",
  preparing: "준비 중",
  ready_for_pickup: "픽업 준비 완료",
  shipped: "배송 중",
  completed: "완료",
  cancelled: "취소됨",
};
const paymentStatusLabels: Record<string, string> = {
  pending: "입금 대기",
  paid: "결제 완료",
  failed: "결제 실패",
  cancelled: "결제 취소",
  refunded: "환불 완료",
};

type PurchasedLine = {
  product_name: string;
  weight: string | null;
  quantity: number;
};

export default async function AccountOrdersPage() {
  if (!hasSupabaseEnv) redirect("/account");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orders = (await getMyOrders()) as Order[];
  const orderIds = orders.map((order) => order.id);
  const { data: orderItems } = orderIds.length
    ? await supabase.from("order_items").select("order_id,product_id,product_name,weight,grind,quantity").in("order_id", orderIds)
    : { data: [] };
  const reorderByOrder = new Map<string, ReorderLine[]>();
  const purchasedByOrder = new Map<string, PurchasedLine[]>();
  for (const item of orderItems ?? []) {
    const reorderLines = reorderByOrder.get(item.order_id) ?? [];
    reorderLines.push({ product_id: item.product_id, weight: item.weight, grind: item.grind, quantity: item.quantity });
    reorderByOrder.set(item.order_id, reorderLines);

    if (item.product_name) {
      const purchasedLines = purchasedByOrder.get(item.order_id) ?? [];
      purchasedLines.push({ product_name: item.product_name, weight: item.weight, quantity: Number(item.quantity) });
      purchasedByOrder.set(item.order_id, purchasedLines);
    }
  }

  return <main className="mx-auto max-w-4xl px-6 py-14 md:px-12 md:py-20">
    <p className="section-label">CASA DI STEFANO · MY ACCOUNT</p>
    <h1 className="mt-4 text-4xl md:text-5xl">My Orders</h1>
    <p className="mt-4 text-[var(--muted)]">구매한 커피와 결제 및 배송·픽업 진행 상황을 확인하세요.</p>
    <div className="mt-10 flex flex-wrap gap-5 border-b border-[var(--line)] pb-5">
      <Link href="/account">← 내 계정</Link>
      <Link href="/tasting-room/order/history">Tasting Room 주문 내역 ↗</Link>
      <Link href="/orders/guest">비회원 온라인 주문 조회 ↗</Link>
    </div>

    {orders.length ? <div className="divide-y divide-[var(--line)]">
      {orders.map((order) => {
        const purchased = purchasedByOrder.get(order.id) ?? [];
        const first = purchased[0];
        const title = first ? first.product_name + (purchased.length > 1 ? ` 외 ${purchased.length - 1}종` : "") : "주문 상품 확인하기";
        const status = order.payment_status === "pending"
          ? "입금 대기"
          : order.delivery_method === "local_delivery" && order.order_status === "shipped"
            ? "직접배송 중"
            : orderStatusLabels[order.order_status] ?? "주문 확인";
        return <article key={order.id} className="py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-medium leading-relaxed">{title}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{new Date(order.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
            </div>
            <strong className="text-xl">₩{Number(order.final_amount ?? order.total).toLocaleString("ko-KR")}</strong>
          </div>

          {purchased.length > 0 && <ul className="mt-4 space-y-1 text-sm text-[var(--muted)]">
            {purchased.map((item, index) =>
              <li key={index}>{item.product_name}{item.weight ? ` · ${item.weight}` : ""} · {item.quantity}개</li>
            )}
          </ul>}

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-[var(--line)] px-3 py-2">{paymentStatusLabels[order.payment_status] ?? order.payment_status}</span>
            <span className="rounded-full border border-[var(--line)] px-3 py-2">{status}</span>
            <span className="rounded-full border border-[var(--line)] px-3 py-2">{deliveryMethodLabels[order.delivery_method] ?? order.delivery_method}</span>
          </div>
          {order.order_source !== "tasting_room" && (reorderByOrder.get(order.id)?.length ?? 0) > 0 && (
            <ReorderButton lines={reorderByOrder.get(order.id)!} />
          )}
          <details className="mt-4 text-xs text-[var(--muted)]">
            <summary className="cursor-pointer">주문번호 확인</summary>
            <code className="mt-2 block break-all">{order.order_number}</code>
          </details>
        </article>;
      })}
    </div> : <section className="py-20 text-center">
      <h2 className="text-2xl">아직 온라인 주문이 없습니다.</h2>
      <p className="mt-3 text-[var(--muted)]">첫 커피를 주문하면 이곳에서 진행 상황을 볼 수 있어요.</p>
      <Link href="/shop" className="button-primary mt-8 inline-block px-6 py-3">커피 둘러보기 ↗</Link>
    </section>}
    <p className="mt-10 text-sm text-[var(--muted)]">비회원 Tasting Room 주문은 별도 주문 내역에서 확인할 수 있습니다.</p>
  </main>;
}
