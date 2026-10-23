import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Roasting Queue | CASA Admin" };

type QueueItem = { product_name: string; weight: string; quantity: number; grind: string; order_id: string };
type QueueOrder = { id: string; order_number: string; order_status: string; payment_status: string; created_at: string; order_items: QueueItem[] | null };

export default async function RoastingQueuePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders")
    .select("id,order_number,order_status,payment_status,created_at,order_items(product_name,weight,quantity,grind,order_id)")
    .in("order_status", ["new", "confirmed", "roasting", "preparing"])
    .order("created_at", { ascending: true }).limit(300);
  const orders = (data ?? []) as QueueOrder[];
  const totals = new Map<string, { product: string; weight: string; quantity: number; orders: Set<string> }>();
  for (const order of orders) {
    if (order.payment_status !== "paid") continue;
    for (const item of order.order_items ?? []) {
      if (!item.product_name || !item.weight) continue;
      const key = [item.product_name, item.weight].join("::");
      const entry = totals.get(key) ?? { product: item.product_name, weight: item.weight, quantity: 0, orders: new Set<string>() };
      entry.quantity += Number(item.quantity ?? 0);
      entry.orders.add(order.order_number);
      totals.set(key, entry);
    }
  }
  const queue = [...totals.values()].sort((a,b) => a.product.localeCompare(b.product, "ko"));
  return <main className="admin-main">
    <div className="admin-page-heading"><div><p className="eyebrow">ROASTERY OPERATIONS</p><h1>Roasting Queue</h1><p>결제 완료 · 준비 전 주문 기준으로 필요한 포장 수량을 확인합니다.</p></div><Link href="/admin" className="admin-secondary-button">← Dashboard</Link></div>
    <section className="admin-kpis"><article><span>준비할 상품 옵션</span><strong>{queue.length}</strong></article><article><span>준비할 포장 수</span><strong>{queue.reduce((sum,item) => sum + item.quantity, 0)}</strong></article><article><span>미처리 주문</span><strong>{orders.filter(order => order.payment_status === "paid").length}</strong></article></section>
    {error ? <p role="alert">주문 정보를 가져오지 못했습니다.</p> : <section className="admin-panel"><h2 className="text-2xl">Preparation list</h2><p className="mt-2 text-sm text-[var(--muted)]">실제 로스팅 필요량은 보유 원두 재고를 차감해 산정하세요. 생두 투입량이나 로스팅 날짜를 자동 산정하지 않습니다.</p><div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3">원두</th><th>용량</th><th>포장 수</th><th>관련 주문</th></tr></thead><tbody>{queue.map(item => <tr key={item.product + item.weight} className="border-b border-[var(--line)]"><td className="py-4">{item.product}</td><td>{item.weight}</td><td>{item.quantity}</td><td>{[...item.orders].join(", ")}</td></tr>)}</tbody></table></div>{!queue.length && <p className="py-8">현재 준비할 결제 완료 주문이 없습니다.</p>}{orders.length === 300 && <p className="mt-3 text-xs">최대 300건 기준 집계입니다.</p>}</section>}
  </main>;
}
