import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { productVariants } from "@/lib/products";
import type { Product } from "@/types";

export const metadata = { title: "Coffee Subscription | MY CASA" };
async function requestSubscription(form: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const productId = String(form.get("product_id") ?? "");
  const size = String(form.get("size") ?? "");
  const grind = String(form.get("grind") ?? "");
  const frequency = Number(form.get("frequency_weeks"));
  if (!["150g","400g"].includes(size) || !["Whole Bean","Filter","Espresso"].includes(grind) || ![2,4].includes(frequency)) redirect("/account/subscriptions?error=invalid");
  const { data: product } = await supabase.from("products").select("*").eq("id",productId).eq("status","active").maybeSingle();
  if (!product || !productVariants(product as Product).some(v => v.size === size && v.available)) redirect("/account/subscriptions?error=unavailable");
  const { error } = await supabase.from("coffee_subscriptions").insert({ user_id: user.id, product_id: productId, size, grind, frequency_weeks: frequency, status: "requested" });
  if (error) redirect("/account/subscriptions?error=save");
  revalidatePath("/account/subscriptions");
  redirect("/account/subscriptions?success=1");
}
export default async function Subscriptions({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: products }, { data: subscriptions }, params] = await Promise.all([
    supabase.from("products").select("*").eq("status","active").order("display_order"),
    supabase.from("coffee_subscriptions").select("id,product_id,size,grind,frequency_weeks,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}),
    searchParams,
  ]);
  const names = new Map((products ?? []).map(p => [p.id,p.name]));
  return <main className="mx-auto max-w-4xl px-6 py-14 md:px-12 md:py-20">
    <p className="section-label">MY CASA · COFFEE SUBSCRIPTION</p><h1 className="mt-4 text-4xl">Coffee Subscription</h1>
    <p className="mt-4 text-[var(--muted)]">원하는 커피와 배송 주기를 신청하세요. 담당자 확인 후 구독이 시작됩니다. 자동 결제·자동 출고는 진행되지 않습니다.</p>
    <Link href="/account" className="mt-5 inline-block underline">← MY CASA</Link>
    {params.success && <p role="status" className="mt-6 rounded border p-4">신청이 접수되었습니다. 운영자가 확인한 후 안내드립니다.</p>}
    {params.error && <p role="alert" className="mt-6 rounded border p-4">신청을 처리하지 못했습니다. 상품 및 옵션을 확인하고 다시 시도해 주세요.</p>}
    <form action={requestSubscription} className="mt-10 grid gap-5 rounded border border-[var(--line)] p-6">
      <h2 className="text-2xl">새 구독 신청</h2>
      <label className="grid gap-2">원두<select name="product_id" required className="border p-3">{(products ?? []).map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      <label className="grid gap-2">용량<select name="size" className="border p-3"><option value="150g">150g</option><option value="400g">400g</option></select></label>
      <label className="grid gap-2">분쇄도<select name="grind" className="border p-3"><option>Whole Bean</option><option>Filter</option><option>Espresso</option></select></label>
      <label className="grid gap-2">주기<select name="frequency_weeks" className="border p-3"><option value="2">2주마다</option><option value="4">4주마다</option></select></label>
      <button className="button-primary px-5 py-4" disabled={!products?.length}>구독 신청하기 ↗</button>
      <p className="text-xs text-[var(--muted)]">신청은 결제나 정기배송 계약 확정을 의미하지 않습니다. 가격·배송·결제 방법은 별도로 안내됩니다.</p>
    </form>
    <section className="mt-12"><h2 className="text-2xl">내 구독 신청 내역</h2><div className="mt-4 divide-y divide-[var(--line)]">{subscriptions?.length ? subscriptions.map(s => <article key={s.id} className="py-5"><strong>{names.get(s.product_id) ?? "커피"} · {s.size}</strong><p className="mt-1 text-sm text-[var(--muted)]">{s.grind} · {s.frequency_weeks}주 · {s.status}</p></article>) : <p className="py-6 text-[var(--muted)]">아직 신청 내역이 없습니다.</p>}</div></section>
  </main>;
}
