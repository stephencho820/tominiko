import Link from "next/link";
import { AccountSignOutButton } from "@/components/AccountSignOutButton";
import { MEMBERSHIP_TIERS, membershipDisplay, normalizeMembershipTier, hasMemberFreeShipping } from "@/lib/membership";
import { getWelcomeBenefit } from "@/lib/welcome-discount";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getMyOrders } from "@/services/orders";
import "./account.css";

export default async function Account() {
  if (!hasSupabaseEnv) {
    return <main className="mycasa-page mycasa-empty"><h1>내 계정</h1><p>회원 서비스를 준비하고 있습니다.</p><Link href="/shop">커피 보러가기 ↗</Link></main>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <main className="mycasa-page mycasa-empty">
      <p className="mycasa-eyebrow">MY CASA</p>
      <h1>내 계정</h1>
      <Link href="/login?next=%2Faccount" className="mycasa-action-primary">로그인하기 ↗</Link>
    </main>;
  }

  const [allOrders, { data: loyalty }, { data: membership }, welcomeBenefit] = await Promise.all([
    getMyOrders(),
    supabase.from("loyalty_accounts").select("balance").eq("user_id", user.id).maybeSingle(),
    supabase.from("vip_customers").select("tier").eq("user_id", user.id).maybeSingle(),
    getWelcomeBenefit(user).catch(() => null),
  ]);
  const orders = allOrders.filter((order) => order.order_source !== "tasting_room");
  const recentOrders = orders.slice(0, 2);
  const orderIds = recentOrders.map((order) => order.id);
  const { data: purchasedLines } = orderIds.length
    ? await supabase.from("order_items").select("order_id,product_name,weight,quantity").in("order_id", orderIds)
    : { data: [] };
  const itemByOrder = new Map<string, Array<{ name: string; weight: string; quantity: number }>>();
  for (const item of purchasedLines ?? []) {
    if (!item.product_name) continue;
    const lines = itemByOrder.get(item.order_id) ?? [];
    lines.push({ name: item.product_name, weight: item.weight ?? "", quantity: Number(item.quantity) || 0 });
    itemByOrder.set(item.order_id, lines);
  }

  const displayName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "회원";
  const tier = normalizeMembershipTier(membership?.tier);
  const current = membershipDisplay(tier);
  const hasFreeShipping = hasMemberFreeShipping(tier);
  const activeBenefit = hasFreeShipping ? "주문금액 관계없이 무료배송" : "구매 시 포인트 2% 적립";
  const statusLabels: Record<string, string> = {
    new: "주문 접수", confirmed: "주문 확인", roasting: "로스팅 중",
    preparing: "준비 중", ready_for_pickup: "픽업 준비", shipped: "배송 중",
    completed: "완료", cancelled: "취소",
  };

  return <main className="mycasa-page">
    <header className="mycasa-header">
      <div className="mycasa-identity">
        <p className="mycasa-eyebrow">MY CASA</p>
        <h1>{displayName}님, 안녕하세요.</h1>
        <p className="mycasa-email">{user.email}</p>
      </div>
      <AccountSignOutButton compact />
    </header>

    <section className={`mycasa-membership mycasa-membership--${tier}`} aria-label="나의 멤버십 등급">
      <div className="mycasa-membership-copy">
        <div className="mycasa-membership-top">
          <span>CASA DI STEFANO · MEMBERSHIP</span>
          <span>YOUR TIER</span>
        </div>
        <h2>{current.name}</h2>
        <p>{activeBenefit}</p>
      </div>
      <ol className="mycasa-tier-track" aria-label="멤버십 등급 단계">
        {MEMBERSHIP_TIERS.map((item) =>
          <li className={item.id === tier ? "is-current" : ""} key={item.id} aria-current={item.id === tier ? "step" : undefined}>
            <span className="mycasa-tier-mark" aria-hidden="true" />
            <span>{item.shortName}</span>
          </li>
        )}
      </ol>
    </section>

    <section className="mycasa-summary" aria-label="나의 혜택과 주문">
      <div className="mycasa-summary-item">
        <span>CASA POINTS</span>
        <strong>{Number(loyalty?.balance ?? 0).toLocaleString("ko-KR")} <small>P</small></strong>
        <p>적립 중 · 사용 준비</p>
      </div>
      <Link className="mycasa-summary-item mycasa-summary-link" href="/account/orders">
        <span>MY ORDERS</span>
        <strong>{orders.length.toLocaleString("ko-KR")} <small>건</small></strong>
        <p>주문 내역 보기 ↗</p>
      </Link>
      <div className="mycasa-summary-item mycasa-summary-benefit">
        <span>MY BENEFIT</span>
        <strong>{welcomeBenefit?.eligible ? "1,000원" : hasFreeShipping ? "FREE" : "2%"}</strong>
        <p>{welcomeBenefit?.eligible ? "첫 주문 자동 할인" : hasFreeShipping ? "택배 무료배송" : "기본 포인트 적립"}</p>
      </div>
    </section>

    <section className="mycasa-orders" aria-label="최근 주문">
      <div className="mycasa-section-heading">
        <h2>최근 주문</h2>
        <Link href="/account/orders">전체 보기 ↗</Link>
      </div>
      {recentOrders.length ? <div className="mycasa-order-list">
        {recentOrders.map((order) => {
          const lines = itemByOrder.get(order.id) ?? [];
          const first = lines[0];
          const name = first ? first.name + (lines.length > 1 ? ` 외 ${lines.length - 1}종` : "") : "주문 상품";
          const quantity = lines.reduce((sum, item) => sum + item.quantity, 0);
          const state = order.order_status === "cancelled" ? "취소" : order.payment_status === "pending" ? "입금 대기" : statusLabels[order.order_status] ?? "진행 중";
          return <Link href="/account/orders" key={order.id} className="mycasa-order-row">
            <div className="mycasa-order-main">
              <strong>{name}</strong>
              <span>{new Date(order.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}{quantity > 0 ? ` · ${quantity}개` : ""}</span>
            </div>
            <span className="mycasa-order-status">{state}</span>
            <strong className="mycasa-order-price">₩{Number(order.final_amount ?? order.total).toLocaleString("ko-KR")}</strong>
            <span className="mycasa-order-chevron" aria-hidden="true">↗</span>
          </Link>;
        })}
      </div> : <p className="mycasa-no-orders">아직 주문이 없어요. <Link href="/shop">첫 커피 만나보기 ↗</Link></p>}
    </section>

    <nav className="mycasa-actions" aria-label="계정 바로가기">
      <Link href="/account/orders">주문 내역 ↗</Link>
      <Link href="/account/subscriptions">구독 관리 ↗</Link>
      <Link href="/tasting-room/order/history">테이스팅룸 주문 ↗</Link>
      <Link href="/shop">SHOP ↗</Link>
    </nav>
  </main>;
}
