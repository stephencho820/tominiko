import Link from "next/link";
import { AccountSignOutButton } from "@/components/AccountSignOutButton";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getMyOrders } from "@/services/orders";

export default async function Account() {
  if (!hasSupabaseEnv) {
    return <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="section-label">Casa di Stefano</p>
      <h1 className="mt-5 text-5xl"><span className="lang-ko">계정 준비 중</span><span className="lang-en">Account unavailable</span></h1>
      <p className="mt-5 text-[var(--muted)]"><span className="lang-ko">로그인을 사용하려면 Supabase 환경 변수를 먼저 설정해 주세요.</span><span className="lang-en">Add the Supabase environment variables to enable sign in.</span></p>
      <Link href="/shop" className="button-secondary eyebrow mt-8 inline-block px-5 py-3"><span className="lang-ko">커피 보러가기 ↗</span><span className="lang-en">Browse coffee ↗</span></Link>
    </main>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="section-label">Casa di Stefano</p>
      <h1 className="mt-5 text-5xl"><span className="lang-ko">나의 계정</span><span className="lang-en">Your account</span></h1>
      <Link href="/login" className="button-primary eyebrow mt-8 inline-block px-5 py-4"><span className="lang-ko">로그인하기 ↗</span><span className="lang-en">Continue with login ↗</span></Link>
    </main>;
  }

  const orders = await getMyOrders();
  const [{ data: loyalty }, { data: pointHistory }, { data: vip }] = await Promise.all([
    supabase.from("loyalty_accounts").select("balance,lifetime_earned").eq("user_id",user.id).maybeSingle(),
    supabase.from("loyalty_transactions").select("id,kind,points,note,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(5),
    supabase.from("vip_customers").select("tier,benefit_note").eq("user_id",user.id).maybeSingle(),
  ]);
  const displayName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0];

  return <main className="mx-auto max-w-4xl px-6 py-14 md:px-12 md:py-20">
    <div className="account-heading">
      <div>
        <p className="section-label"><span className="lang-ko">내 계정</span><span className="lang-en">My account</span></p>
        <h1 className="account-greeting"><span className="lang-ko">안녕하세요.<br />{displayName}님.</span><span className="lang-en">Hello.<br />{displayName}.</span></h1>
        <p className="mt-4 text-[var(--muted)]">{user.email}</p>
      </div>
      <AccountSignOutButton />
    </div>

    {vip && <section className="mb-8 rounded border border-[var(--line)] p-6" aria-label="VIP membership"><p className="section-label">CASA PRIVATE MEMBERSHIP</p><h2 className="mt-3 text-2xl">{vip.tier === "private" ? "PRIVATE" : "VIP"} MEMBER</h2><p className="mt-3 text-[var(--muted)]">{vip.benefit_note || "회원님을 위한 개별 혜택은 매장에서 안내해 드립니다."}</p><p className="mt-2 text-xs text-[var(--muted)]">혜택은 자동 결제 할인으로 적용되지 않습니다.</p></section>}
    <section className="member-points-panel" aria-label="멤버 포인트"><div><p className="section-label">CASA REWARDS</p><h2>My Points</h2><p>로그인 회원의 결제 완료 및 픽업·배송 완료 주문에 2%가 적립됩니다.</p></div><div className="member-points-balance"><strong>{Number(loyalty?.balance??0).toLocaleString("ko-KR")} P</strong><span>누적 적립 {Number(loyalty?.lifetime_earned??0).toLocaleString("ko-KR")} P</span></div></section>
    <div className="member-points-history"><h3>포인트 내역</h3>{pointHistory?.length?pointHistory.map(item=><div key={item.id}><span>{item.note}<small>{new Date(item.created_at).toLocaleDateString("ko-KR")}</small></span><strong>{item.points>0?"+":""}{item.points.toLocaleString("ko-KR")} P</strong></div>):<p>아직 적립된 포인트가 없습니다.</p>}<p className="member-points-policy">1P = 1원 상당 · 현재는 적립 및 조회만 제공하며 결제 시 사용 기능은 준비 중입니다. 취소·환불 시 적립이 회수됩니다.</p></div>
    <div className="mt-16 flex items-center justify-between border-b border-[var(--line)] pb-4">
      <h2 className="text-3xl"><span className="lang-ko">최근 주문</span><span className="lang-en">Recent orders</span></h2>
      <Link href="/tasting-room/order/history" className="eyebrow">TASTING ROOM ORDERS ↗</Link><Link href="/account/orders" className="eyebrow"><span className="lang-ko">전체 보기</span><span className="lang-en">View all</span> ↗</Link>
    </div>
    {orders.length ? orders.map((order) => <div className="flex justify-between border-b border-[var(--line)] py-5" key={order.id}>
      <span>{order.order_number}</span>
      <span className="sans text-xs uppercase">{order.order_status}</span>
      <span>₩{Number(order.total).toLocaleString()}</span>
    </div>) : <p className="py-10 text-[var(--muted)]"><span className="lang-ko">아직 주문 내역이 없습니다.</span><span className="lang-en">No orders yet.</span></p>}
  </main>;
}
