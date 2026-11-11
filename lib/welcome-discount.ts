import { createServiceClient } from "@/lib/supabase/service";
import type { User } from "@supabase/supabase-js";

export type WelcomeBenefit = {
  enabled: boolean;
  signedIn: boolean;
  eligible: boolean;
  amount: number;
};

export async function getWelcomeBenefit(user: Pick<User, "id" | "created_at"> | null): Promise<WelcomeBenefit> {
  const fallback: WelcomeBenefit = { enabled: false, signedIn: Boolean(user), eligible: false, amount: 0 };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fallback;

  const supabase = createServiceClient();
  const { data: settings, error: settingsError } = await supabase
    .from("welcome_discount_settings")
    .select("enabled,amount,started_at")
    .eq("id", true)
    .maybeSingle();

  if (settingsError) throw new Error("Welcome benefit settings are unavailable");
  if (!settings?.enabled || !Number.isFinite(settings.amount) || settings.amount <= 0) return fallback;

  const amount = Number(settings.amount);
  if (!user) return { enabled: true, signedIn: false, eligible: false, amount };
  if (Date.parse(user.created_at) < Date.parse(settings.started_at))
    return { enabled: true, signedIn: true, eligible: false, amount };

  const { count, error: ordersError } = await supabase
    .from("orders")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id);

  if (ordersError) throw new Error("Welcome benefit eligibility is unavailable");
  return { enabled: true, signedIn: true, eligible: count === 0, amount };
}
