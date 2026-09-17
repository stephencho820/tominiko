import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminClient())) redirect("/login");
  return <div className="admin-shell"><header className="admin-header"><Link href="/admin" className="admin-brand"><span>Casa di Stefano</span><small>Roastery operations</small></Link><nav aria-label="Admin navigation"><Link href="/admin">Today</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/products">Products</Link><Link href="/">Store ↗</Link></nav></header>{children}</div>;
}
