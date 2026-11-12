import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";

async function markPacked(formData: FormData) {
  "use server";
  if (!await getAdminClient()) throw new Error("관리자 권한이 필요합니다.");
  const giftId = Number(formData.get("gift_id"));
  if (!Number.isSafeInteger(giftId) || giftId < 1) throw new Error("잘못된 증정 내역입니다.");
  const db = createServiceClient();
  const { data: gift } = await db.from("membership_coffee_bag_gifts")
    .select("id,order_id,status").eq("id",giftId).eq("status","pending").maybeSingle();
  if (!gift) throw new Error("이미 처리되었거나 존재하지 않는 증정입니다.");
  const { data: order } = await db.from("orders")
    .select("payment_status,order_status").eq("id",gift.order_id).single();
  if (!order || order.payment_status !== "paid" || order.order_status === "cancelled")
    throw new Error("결제 완료된 유효한 주문에만 동봉할 수 있습니다.");
  const { data, error } = await db.from("membership_coffee_bag_gifts")
    .update({status:"packed",packed_at:new Date().toISOString()})
    .eq("id",giftId).eq("status","pending").select("id").maybeSingle();
  if (error || !data) throw new Error("동봉 확인을 저장하지 못했습니다.");
  revalidatePath("/admin/membership-gifts");
}

export default async function MembershipGiftsPage() {
  if (!await getAdminClient()) return null;
  const db = createServiceClient();
  const { data: gifts, error } = await db.from("membership_coffee_bag_gifts")
    .select("id,user_id,order_id,gift_month,gift_kind,quantity,status,created_at")
    .order("created_at", { ascending: false }).limit(200);
  const memberIds = [...new Set((gifts ?? []).map(item => item.user_id))];
  const orderIds = [...new Set((gifts ?? []).map(item => item.order_id))];
  const [{ data: profiles }, { data: orders }] = await Promise.all([
    memberIds.length ? db.from("profiles").select("id,name,email").in("id",memberIds) : Promise.resolve({data:[]}),
    orderIds.length ? db.from("orders").select("id,order_number,payment_status,order_status").in("id",orderIds) : Promise.resolve({data:[]}),
  ]);
  const people = new Map((profiles ?? []).map(p => [p.id, p]));
  const orderById = new Map((orders ?? []).map(o => [o.id,o]));
  const pending = (gifts ?? []).filter(g => g.status==="pending");
  return <main className="admin-main">
    <div className="admin-page-heading">
      <div>
        <p className="eyebrow">CASA MEMBERSHIP</p>
        <h1>커피백 동봉 관리</h1>
        <p>입금 완료 주문에서 자동 생성됩니다. 매월 계정당 1회만 증정합니다.</p>
      </div>
      <Link href="/admin/vip" className="admin-secondary-button">등급 관리 ↗</Link>
    </div>
    {error ? <p role="alert">증정 내역을 불러오지 못했습니다.</p> : <section className="admin-panel">
      <div className="mb-5 flex items-center gap-5 text-sm">
        <span>동봉 대기 <strong>{pending.length}</strong>건</span>
        <span>확인 완료 <strong>{(gifts ?? []).length - pending.length}</strong>건</span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {(gifts ?? []).map(gift => {
          const person=people.get(gift.user_id);
          const order=orderById.get(gift.order_id);
          const valid = order?.payment_status==="paid" && order?.order_status!=="cancelled";
          return <article key={gift.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <strong className="block text-sm">{person?.name || person?.email || "회원"} · 커피백 {gift.quantity}개</strong>
              <p className="mt-1 break-all text-xs text-[var(--muted)]">
                {gift.gift_month.slice(0,7)} · {gift.gift_kind==="bronze_welcome"?"Bronze 승급 기념":"월 1회 증정"}
                {" · "}{order?.order_number || "주문 확인 필요"}
              </p>
            </div>
            {gift.status==="packed" ? <span className="text-sm">동봉 확인됨</span> :
              <form action={markPacked}>
                <input type="hidden" name="gift_id" value={gift.id}/>
                <button className="admin-primary-button" type="submit" disabled={!valid}>동봉 완료</button>
              </form>}
          </article>;
        })}
        {!gifts?.length && <p className="py-8 text-sm text-[var(--muted)]">아직 증정 대상 주문이 없습니다.</p>}
      </div>
    </section>}
  </main>;
}
