import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_DELIVERY_SETTINGS, settingsFromRow } from "@/lib/shipping";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getWelcomeBenefit } from "@/lib/welcome-discount";
import { hasMemberFreeShipping } from "@/lib/membership";

export async function GET() {
  if (!hasSupabaseEnv) return NextResponse.json({ settings: DEFAULT_DELIVERY_SETTINGS, zones: [], user: null, addresses: [], welcomeDiscount: 0, welcomePromotionActive: false });
  const supabase = await createClient();
  const [{ data: settings, error: settingsError }, { data: zones, error: zonesError }, { data: auth }] = await Promise.all([
    supabase.from("delivery_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("local_delivery_zones").select("zone_type,zone_value,enabled").eq("enabled", true),
    supabase.auth.getUser(),
  ]);
  if (settingsError || zonesError || !settings) return NextResponse.json({ error: "Could not load delivery settings" }, { status: 503 });
  let profile = null; let addresses: unknown[] = []; let isVip = false;
  if (auth.user) {
    const [{ data: profileData }, { data: addressData }, { data: vipData }] = await Promise.all([
      supabase.from("profiles").select("name,email,phone").eq("id", auth.user.id).maybeSingle(),
      supabase.from("user_addresses").select("*").order("is_default", { ascending: false }).order("created_at"),
      supabase.from("vip_customers").select("tier").eq("user_id", auth.user.id).maybeSingle(),
    ]);
    profile = profileData;
    isVip = hasMemberFreeShipping(vipData?.tier);
    addresses = addressData ?? [];
  }
  let benefit;
  try { benefit = await getWelcomeBenefit(auth.user); }
  catch { return NextResponse.json({ error: "할인 혜택을 확인하지 못했습니다." }, { status: 503 }); }
  return NextResponse.json({ settings: settingsFromRow(settings), zones: zones ?? [], user: auth.user ? { ...profile, email: profile?.email || auth.user.email } : null, addresses, isVip, welcomeDiscount: benefit.eligible ? benefit.amount : 0, welcomePromotionActive: benefit.enabled }, { headers: { "Cache-Control": "private, no-store" } });
}
