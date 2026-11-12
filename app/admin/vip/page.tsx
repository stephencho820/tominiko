import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { MEMBERSHIP_TIERS, normalizeMembershipTier } from "@/lib/membership";

async function saveMembership(formData: FormData) {
  "use server";
  const supabase = await getAdminClient();
  if (!supabase) throw new Error("Unauthorized");
  const userId = String(formData.get("user_id") ?? "");
  const tier = String(formData.get("tier") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ||
      !["general", "bronze", "silver", "gold", "zero_black"].includes(tier))
    throw new Error("Invalid membership setting");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) throw new Error("Customer account not found");
  const result = tier === "general"
    ? await supabase.from("vip_customers").delete().eq("user_id", userId)
    : await supabase.from("vip_customers").upsert({ user_id: userId, tier }, { onConflict: "user_id" });

  if (result.error) throw new Error("Unable to save membership setting");
  revalidatePath("/admin/vip");
  revalidatePath("/account");
}

export default async function AdminMembershipPage() {
  const supabase = await getAdminClient();
  if (!supabase) return null;
  const [{ data: profiles, error: profilesError }, { data: memberTiers, error: tiersError }] = await Promise.all([
    supabase.from("profiles").select("id,email,name,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("vip_customers").select("user_id,tier"),
  ]);
  const tierByUser = new Map((memberTiers ?? []).map((row) => [row.user_id, normalizeMembershipTier(row.tier)]));
  const goldCount = [...tierByUser.values()].filter((tier) => tier === "gold").length;
  return <main className="admin-main">
    <div className="admin-page-heading">
      <div>
        <p className="eyebrow">CASA MEMBERSHIP</p>
        <h1>멤버십 등급 관리</h1>
        <p>회원의 등급을 선택해 저장하세요. Gold · Zero Black은 자동 무료배송이 적용됩니다.</p>
      </div>
    </div>
    {profilesError || tiersError
      ? <p role="alert">회원 데이터를 불러오지 못했습니다.</p>
      : <section className="admin-panel">
        <p className="mb-5 text-sm">회원 {(profiles ?? []).length}명 · Gold {goldCount}명</p>
        <div className="divide-y divide-[var(--line)]">
          {(profiles ?? []).map((profile) => {
            const tier = tierByUser.get(profile.id) ?? "general";
            return <form action={saveMembership} key={profile.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <input type="hidden" name="user_id" value={profile.id} />
              <div className="min-w-0">
                <strong className="block text-sm">{profile.name || profile.email || "고객"}</strong>
                <p className="mt-1 break-all text-xs text-[var(--muted)]">{profile.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`tier-${profile.id}`}>등급</label>
                <select id={`tier-${profile.id}`} name="tier" defaultValue={tier} className="border border-[var(--line)] px-3 py-2 text-sm">
                  {MEMBERSHIP_TIERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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
