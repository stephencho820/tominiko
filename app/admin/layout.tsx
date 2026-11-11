import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { AccountSignOutButton } from "@/components/AccountSignOutButton";
import { AdminWorkspaceChrome } from "@/components/AdminWorkspaceChrome";
import "./admin.css";

export const metadata = {
  title: "운영 관리 | CASA ADMIN",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminClient())) redirect("/login?next=%2Fadmin");
  return (
    <AdminWorkspaceChrome signOut={<AccountSignOutButton compact />}>
      {children}
    </AdminWorkspaceChrome>
  );
}
