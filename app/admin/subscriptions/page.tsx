import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";

async function updateRequest(formData: FormData) {
  "use server";
  const supabase = await getAdminClient();
  if (!supabase) throw new Error("Unauthorized");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["requested","contacted","active","paused","cancelled"].includes(status)) throw new Error("Invalid request");
  const { error } = await supabase.from("coffee_subscriptions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Unable to update request");
  revalidatePath("/admin/subscriptions");
}
export default async function AdminSubscriptions() {
  const supabase = await getAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("coffee_subscriptions").select("id,user_id,coffee_preference,frequency_weeks,weight_grams,status,created_at").order("created_at", { ascending: false }).limit(200);
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">COFFEE SUBSCRIPTION</p><h1>Subscription requests</h1><p>상담 신청을 관리합니다. 상태 변경은 결제 또는 배송을 실행하지 않습니다.</p></div></div>
    {error ? <p role="alert">신청 목록을 불러오지 못했습니다.</p> : <div className="admin-panel">{(data ?? []).map(r => <article key={r.id} className="border-b border-[var(--line)] py-5"><p className="text-sm">{new Date(r.created_at).toLocaleString("ko-KR")} · 고객 ID {r.user_id}</p><h2 className="mt-2 text-lg">{r.coffee_preference} · {r.weight_grams}g · {r.frequency_weeks}주</h2><form action={updateRequest} className="mt-3 flex flex-wrap items-center gap-3"><input type="hidden" name="id" value={r.id}/><select name="status" defaultValue={r.status} className="border p-3">{["requested","contacted","active","paused","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}</select><button className="admin-primary-button" type="submit">상태 저장</button></form></article>)}{!data?.length && <p>아직 신청이 없습니다.</p>}</div>}
  </main>;
}
