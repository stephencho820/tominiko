import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { MEMBERSHIP_TIERS, normalizeMembershipTier } from "@/lib/membership";
import { createServiceClient } from "@/lib/supabase/service";
import { getMemberStatus } from "@/lib/member-status";

async function saveMembership(formData: FormData) {
  "use server";
  const supabase = await getAdminClient();
  if (!supabase) throw new Error("Unauthorized");
  const userId = String(formData.get("user_id") ?? "");
  const tier = String(formData.get("tier") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ||
      !["auto", "bronze", "silver", "gold", "zero_black"].includes(tier))
    throw new Error("Invalid membership setting");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) throw new Error("Customer account not found");
  if (tier === "zero_black" && (await getMemberStatus(userId)).spent12Months < 720000)
    throw new Error("ZERO BLACK은 최근 12개월 실구매액 72만원 이상인 회원만 승인할 수 있습니다.");
  const result = tier === "auto"
    ? await supabase.from("vip_customers").delete().eq("user_id", userId)
    : await supabase.from("vip_customers").upsert({ user_id: userId, tier }, { onConflict: "user_id" });

  if (result.error) throw new Error("Unable to save membership setting");
  revalidatePath("/admin/vip");
  revalidatePath("/account");
}

export default async function AdminMembershipPage() {
  const supabase = await getAdminClient();
  if (!supabase) return null;
  const db = createServiceClient();
  const yearAgo = new Date();
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const [{ data: profiles, error: profilesError }, { data: memberTiers, error: tiersError }, { data: awards }, { data: paidOrders }] = await Promise.all([
    supabase.from("profiles").select("id,email,name,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("vip_customers").select("user_id,tier"),
    db.from("membership_auto_awards").select("user_id,tier,protected_until"),
    db.from("orders").select("user_id,product_subtotal,subtotal,discount_amount").eq("payment_status","paid").neq("order_status","cancelled").gte("created_at",yearAgo.toISOString()).not("user_id","is",null),
  ]);
  const tierByUser = new Map((memberTiers ?? []).map((row) => [row.user_id, normalizeMembershipTier(row.tier)]));
  const goldCount = [...tierByUser.values()].filter((tier) => tier === "gold").length;
  const autoTiers = new Map((awards ?? []).filter(a => Date.parse(a.protected_until)>Date.now()).map(a => [a.user_id, normalizeMembershipTier(a.tier)]));
  const spendByUser = new Map<string,number>();
  for (const order of paidOrders ?? []) {
    if (!order.user_id) continue;
    const net = Math.max(0, Number(order.product_subtotal ?? order.subtotal ?? 0) - Number(order.discount_amount ?? 0));
    spendByUser.set(order.user_id, (spendByUser.get(order.user_id) ?? 0) + net);
  }
  const reviewCount = [...spendByUser].filter(([id, spend]) => spend>=720000 && tierByUser.get(id)!=="zero_black").length;
  return <main className="admin-main">
    <div className="admin-page-heading">
      <div>
        <p className="eyebrow">CASA MEMBERSHIP</p>
        <h1>멤버십 등급 관리</h1>
        <p>실구매액으로 자동 승급 · Zero Black은 관리자 승인</p>
      </div>
    </div>
    {profilesError || tiersError
      ? <p role="alert">회원 데이터를 불러오지 못했습니다.</p>
      : <section className="admin-panel">
        <p className="mb-5 text-sm">회원 {(profiles ?? []).length}명 · 기존 Gold {goldCount}명 · Zero Black 승인 대상 {reviewCount}명</p>
        <div className="divide-y divide-[var(--line)]">
          {(profiles ?? []).map((profile) => {
            const manualTier = tierByUser.get(profile.id);
            const spent = spendByUser.get(profile.id) ?? 0;
            const qualifiedTier = spent >= 360000 ? "gold" : spent >= 180000 ? "silver" : spent >= 60000 ? "bronze" : "general";
            const savedTier = autoTiers.get(profile.id) ?? "general";
            const ranks: Record<string, number> = { general:0, bronze:1, silver:2, gold:3, zero_black:4 };
            const autoTier = ranks[qualifiedTier] >= ranks[savedTier] ? qualifiedTier : savedTier;
            const tier = manualTier ?? "auto";
            return <form action={saveMembership} key={profile.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <input type="hidden" name="user_id" value={profile.id} />
              <div className="min-w-0">
                <strong className="block text-sm">{profile.name || profile.email || "고객"}</strong>
                <p className="mt-1 break-all text-xs text-[var(--muted)]">{profile.email}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">최근 12개월 ₩{spent.toLocaleString("ko-KR")} · {manualTier ? "관리자 지정" : `자동 ${autoTier}`}{spent >= 720000 && manualTier !== "zero_black" ? " · ZERO BLACK 승인 가능" : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`tier-${profile.id}`}>등급</label>
                <select id={`tier-${profile.id}`} name="tier" defaultValue={tier} className="border border-[var(--line)] px-3 py-2 text-sm">
                  <option value="auto">자동 승급 적용</option>
                  {MEMBERSHIP_TIERS.filter(item => item.id !== "general").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button className="admin-primary-button" type="submit">저장</button>
              </div>
            </form>;
          })}
          {!profiles?.length && <p>등록 고객이 없습니다.</p>}
        </div>
      </section>}
  </main>;
}
