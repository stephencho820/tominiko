import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Customers | Admin" };

type CustomerOrder = { email: string | null; customer_name: string | null; total: number; final_amount: number | null; payment_status: string; created_at: string };
export default async function CustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("email,customer_name,total,final_amount,payment_status,created_at").order("created_at", { ascending: false }).limit(1000);
  const orders = (data ?? []) as CustomerOrder[];
  const customers = new Map<string, { name: string; email: string; orders: number; paidOrders: number; revenue: number; latest: string }>();
  for (const order of orders) {
    const email = order.email?.trim().toLowerCase();
    if (!email) continue;
    const customer = customers.get(email) ?? { name: order.customer_name ?? "", email, orders: 0, paidOrders: 0, revenue: 0, latest: order.created_at };
    customer.orders++;
    if (order.payment_status === "paid") { customer.paidOrders++; customer.revenue += Number(order.final_amount ?? order.total ?? 0); }
    customers.set(email, customer);
  }
  const ranked = [...customers.values()].sort((a, b) => b.revenue - a.revenue);
  return <main className="admin-main">
    <div className="admin-page-heading"><div><p className="eyebrow">CUSTOMER INSIGHTS</p><h1>Customers</h1><p>주문 기록을 바탕으로 고객별 구매 현황을 확인합니다.</p></div><Link href="/admin" className="admin-secondary-button">← Dashboard</Link></div>
    <section className="admin-kpis">
      <article><span>고객 수</span><strong>{ranked.length}</strong><small>이메일 기준 중복 제거</small></article>
      <article><span>재구매 고객</span><strong>{ranked.filter(c => c.paidOrders > 1).length}</strong><small>결제 완료 2건 이상</small></article>
      <article><span>결제 완료 주문</span><strong>{ranked.reduce((sum,c) => sum + c.paidOrders,0)}</strong><small>조회 범위 내</small></article>
    </section>
    {error ? <p role="alert">고객 정보를 불러오지 못했습니다.</p> : <section className="admin-panel">
      <h2 className="text-2xl">Customer overview</h2>
      <p className="mt-2 text-sm">최근 최대 1,000건의 주문을 집계합니다. 매출은 결제 완료 주문 기준이며 환불 차감은 포함하지 않습니다.</p>
      <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3">고객</th><th>주문</th><th>결제 완료</th><th>누적 결제액</th><th>최근 주문</th></tr></thead><tbody>{ranked.map(c => <tr key={c.email} className="border-b border-[var(--line)]"><td className="py-4"><strong>{c.name || "고객"}</strong><br/><span>{c.email}</span></td><td>{c.orders}</td><td>{c.paidOrders}</td><td>₩{c.revenue.toLocaleString("ko-KR")}</td><td>{new Date(c.latest).toLocaleDateString("ko-KR")}</td></tr>)}</tbody></table></div>
      {!ranked.length && <p className="py-8">아직 집계할 고객 주문이 없습니다.</p>}
    </section>}
  </main>;
}
