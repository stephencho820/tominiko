import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { AccountSignOutButton } from "@/components/AccountSignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminClient())) redirect("/login");
  return <div className="admin-shell">
    <header className="admin-header">
      <Link href="/admin" className="admin-brand">
        <span>Casa di Stefano</span>
        <small>ADMIN</small>
      </Link>
      <nav aria-label="Admin navigation">
        <Link href="/admin">대시보드</Link>
        <Link href="/admin/orders">주문</Link>
        <Link href="/admin/products">상품</Link>
        <Link href="/admin/reviews">리뷰</Link>
        <Link href="/admin/pages">페이지</Link>
        <Link href="/admin/delivery">배송</Link>
      </nav>
      <div className="admin-header-actions">
        <Link href="/" className="admin-store-link">사이트 보기 ↗</Link>
        <AccountSignOutButton compact />
      </div>
    </header>
    {children}
  </div>;
}
