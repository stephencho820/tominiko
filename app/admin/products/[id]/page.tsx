import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminProductForm } from "@/components/AdminProductForm";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) { const supabase = await createClient(); const { data } = await supabase.from("products").select("*").eq("id", (await params).id).single(); if (!data) notFound(); return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Products / Edit</p><h1>{data.name}</h1><p>Keep this batch accurate for the shop and fulfillment.</p></div></div><AdminProductForm product={data} /></main>; }
