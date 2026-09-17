import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Admin() {
  const supabase = await createClient();
  const [{ count: products }, { count: orders }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);

  return <main className="px-6 py-12 md:px-12"><p className="eyebrow">Overview</p><h1 className="mt-3 text-5xl">Dashboard</h1><div className="mt-12 grid gap-px border border-[#c8bfb2] sm:grid-cols-3"><div className="bg-[#f4f0e8] p-6"><p className="eyebrow">Total products</p><p className="mt-8 text-5xl">{products ?? 0}</p></div><div className="bg-[#f4f0e8] p-6"><p className="eyebrow">Total orders</p><p className="mt-8 text-5xl">{orders ?? 0}</p></div><div className="bg-[#f4f0e8] p-6"><p className="eyebrow">Today&apos;s roast</p><Link href="/admin/products" className="mt-8 block text-xl underline">Manage →</Link></div></div></main>;
}
