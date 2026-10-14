import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";

async function saveVip(formData: FormData) {
  "use server";
  const supabase = await getAdminClient();
  if (!supabase) throw new Error("Unauthorized");
  const userId = String(formData.get("user_id") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const note = String(formData.get("benefit_note") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || !["vip","private","none"].includes(tier) || note.length > 500) throw new Error("Invalid VIP setting");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id",userId).maybeSingle();
  if (!profile) throw new Error("Customer account not found");
  const result = tier === "none" ? await supabase.from("vip_customers").delete().eq("user_id",userId) : await supabase.from("vip_customers").upsert({ user_id:userId, tier, benefit_note:note },{onConflict:"user_id"});
  if (result.error) throw new Error("Unable to save VIP setting");
  revalidatePath("/admin/vip");
  revalidatePath("/account");
}
export default async function AdminVipPage() {
  const supabase = await getAdminClient();
  if (!supabase) return null;
  const [{data:profiles,error:profilesError},{data:vip,error:vipError}] = await Promise.all([
    supabase.from("profiles").select("id,email,name,created_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("vip_customers").select("user_id,tier,benefit_note")
  ]);
  const vipByUser = new Map((vip ?? []).map(row => [row.user_id,row]));
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">CUSTOMER RELATIONSHIPS</p><h1>VIP Management</h1><p>가입 고객에게 VIP 등급과 개별 혜택 메모를 지정합니다. 할인이나 포인트는 자동 적용되지 않습니다.</p></div></div>
    {profilesError || vipError ? <p role="alert">고객 데이터를 불러오지 못했습니다.</p> : <section className="admin-panel"><p className="mb-6">등록 고객 {(profiles ?? []).length}명 (최근 최대 200명) · VIP {(vip ?? []).length}명</p>{(profiles ?? []).map(profile => {const current=vipByUser.get(profile.id);return <article key={profile.id} className="border-b border-[var(--line)] py-5"><h2 className="text-lg">{profile.name || profile.email || "고객"}</h2><p className="text-sm">{profile.email}</p><form action={saveVip} className="mt-3 flex flex-wrap gap-3"><input type="hidden" name="user_id" value={profile.id}/><label>등급 <select className="ml-2 border p-2" name="tier" defaultValue={current?.tier ?? "none"}><option value="none">일반</option><option value="vip">VIP</option><option value="private">PRIVATE</option></select></label><label>혜택 메모 <input className="ml-2 border p-2" type="text" maxLength={500} name="benefit_note" defaultValue={current?.benefit_note ?? ""} placeholder="개별 혜택 안내"/></label><button type="submit" className="admin-primary-button">저장</button></form></article>;})}{!profiles?.length && <p>등록 고객이 없습니다.</p>}</section>}
  </main>;
}
