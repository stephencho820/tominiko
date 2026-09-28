import { AdminProductForm } from "@/components/AdminProductForm";
import { requireAdminClient } from "@/lib/supabase/admin";
export default async function NewProduct() { await requireAdminClient(); return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Products</p><h1>New product</h1><p>Add a coffee to the current small-batch catalog.</p></div></div><AdminProductForm /></main>; }
