import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

export async function getAdminClient() {
  // Never prerender an auth decision at build time. Deployment credentials and
  // the user's session are request-time state.
  noStore();
  if (!hasSupabaseEnv) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? supabase : null;
}

/** Layout redirects do not prevent a child Server Component from rendering in
 * parallel, so data-reading admin pages must guard themselves too. */
export async function requireAdminClient() {
  const supabase = await getAdminClient();
  if (!supabase) redirect("/login");
  return supabase;
}
