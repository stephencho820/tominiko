import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getMyOrders } from "@/services/orders";
import { deliveryMethodLabels, orderStatusLabel, paymentStatusLabels } from "@/lib/admin";
import type { Order } from "@/types";

export const metadata = { title: "My Orders" };

export default async function AccountOrdersPage() {
  if (!hasSupabaseEnv) redirect("/account");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orders = (await getMyOrders()) as Order[];
  return <main className="mx-auto max-w-4xl px-6 py-14 md:px-12 md:py-20">
    <p className="section-label">CASA DI STEFANO · MY ACCOUNT</p>
    <h1 className="mt-4 text-4xl md:text-5xl">My Orders</h1>
    <p className="mt-4 text-[var(--muted)]">온라인 주문의 결제 및 배송·픽업 진행 상황을 확인하세요.</p>
    <div className="mt-10 flex flex-wrap gap-5 border-b border-[var(--line)] pb-5">
      <Link href="/account">← 내 계정</Link>
      <Link href="/tasting-room/order/history">Tasting Room 주문 내역 ↗</Link>
    </div>
    {orders.length ? <div className="divide-y divide-[var(--line)]">
      {orders.map(order => <article key={order.id} className="py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label">{order.order_number}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{new Date(order.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
          </div>
          <strong className="text-xl">₩{Number(order.total).toLocaleString("ko-KR")}</strong>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-[var(--line)] px-3 py-2">{paymentStatusLabels[order.payment_status] ?? order.payment_status}</span>
          <span className="rounded-full border border-[var(--line)] px-3 py-2">{orderStatusLabel(order.order_status, order.delivery_method)}</span>
          <span className="rounded-full border border-[var(--line)] px-3 py-2">{deliveryMethodLabels[order.delivery_method] ?? order.delivery_method}</span>
        </div>
      </article>)}
    </div> : <section className="py-20 text-center">
      <h2 className="text-2xl">아직 온라인 주문이 없습니다.</h2>
      <p className="mt-3 text-[var(--muted)]">첫 커피를 주문하면 이곳에서 진행 상황을 볼 수 있어요.</p>
      <Link href="/shop" className="button-primary mt-8 inline-block px-6 py-3">커피 둘러보기 ↗</Link>
    </section>}
    <p className="mt-10 text-sm text-[var(--muted)]">비회원 Tasting Room 주문은 별도 주문 내역에서 확인할 수 있습니다.</p>
  </main>;
}
