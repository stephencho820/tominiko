import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminClient())) redirect("/login");

  return (
    <div className="min-h-screen bg-[#e8e1d7]">
      <div className="flex flex-wrap items-center gap-6 border-b border-[#c8bfb2] px-6 py-5 md:px-12">
        <Link href="/admin" className="eyebrow">Casa / Admin</Link>
        <nav className="ml-auto flex flex-wrap gap-5" aria-label="Admin navigation">
          <Link href="/admin/products" className="eyebrow">Products</Link>
          <Link href="/admin/orders" className="eyebrow">Orders</Link>
          <Link href="/" className="eyebrow">Store ↗</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
