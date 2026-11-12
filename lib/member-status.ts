import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { membershipDisplay, normalizeMembershipTier, type MembershipTier } from "@/lib/membership";

const THRESHOLDS = { general: 0, bronze: 60000, silver: 180000, gold: 360000, zero_black: 720000 } as const;
const RANK: Record<MembershipTier, number> = { general: 0, bronze: 1, silver: 2, gold: 3, zero_black: 4 };

function earnedTier(spent: number): MembershipTier {
  if (spent >= THRESHOLDS.gold) return "gold";
  if (spent >= THRESHOLDS.silver) return "silver";
  if (spent >= THRESHOLDS.bronze) return "bronze";
  return "general";
}

export type MemberStatus = {
  tier: MembershipTier;
  name: string;
  spent12Months: number;
  nextTier: MembershipTier | null;
  nextThreshold: number | null;
  remaining: number;
  progress: number;
  zeroBlackEligibleForReview: boolean;
  manuallyAssigned: boolean;
  protectedUntil: string | null;
  monthlyGift: { quantity: number; status: "pending" | "packed" } | null;
};

export async function getMemberStatus(userId: string): Promise<MemberStatus> {
  const db = createServiceClient();
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const [manualResult, awardResult, ordersResult, giftsResult] = await Promise.all([
    db.from("vip_customers").select("tier").eq("user_id", userId).maybeSingle(),
    db.from("membership_auto_awards").select("tier,protected_until").eq("user_id", userId).maybeSingle(),
    db.from("orders")
      .select("product_subtotal,subtotal,discount_amount")
      .eq("user_id", userId).eq("payment_status", "paid")
      .neq("order_status", "cancelled").gte("created_at", start.toISOString()),
    db.from("membership_coffee_bag_gifts").select("quantity,status")
      .eq("user_id", userId).eq("gift_kind", "monthly")
      .eq("gift_month", new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()) + "-01")
      .limit(1),
  ]);
  if (manualResult.error || awardResult.error || ordersResult.error || giftsResult.error)
    throw new Error("멤버십 정보를 확인하지 못했습니다.");

  const spent = (ordersResult.data ?? []).reduce((sum, order) => sum + Math.max(0,
    Number(order.product_subtotal ?? order.subtotal ?? 0) - Number(order.discount_amount ?? 0)), 0);
  const computed = earnedTier(spent);
  const award = awardResult.data;
  const awarded = award && Date.parse(award.protected_until) > Date.now()
    ? normalizeMembershipTier(award.tier) : "general";
  const automatic = RANK[computed] >= RANK[awarded] ? computed : awarded;
  const hasManual = Boolean(manualResult.data);
  const tier = hasManual ? normalizeMembershipTier(manualResult.data?.tier) : automatic;
  const nextTier: MembershipTier | null =
    tier === "general" ? "bronze" :
    tier === "bronze" ? "silver" :
    tier === "silver" ? "gold" :
    tier === "gold" ? "zero_black" : null;
  const nextThreshold = nextTier ? THRESHOLDS[nextTier] : null;
  const currentFloor = THRESHOLDS[tier];
  const progress = nextThreshold
    ? Math.max(0, Math.min(100, Math.round(100 * (spent-currentFloor) / (nextThreshold-currentFloor))))
    : 100;
  const remaining = nextThreshold ? Math.max(0, nextThreshold-spent) : 0;

  const gift = giftsResult.data?.[0];
  return {
    tier, name: membershipDisplay(tier).name, spent12Months: spent,
    nextTier, nextThreshold, remaining, progress,
    zeroBlackEligibleForReview: tier === "gold" && spent >= THRESHOLDS.zero_black,
    manuallyAssigned: hasManual,
    protectedUntil: hasManual ? null : award?.protected_until ?? null,
    monthlyGift: gift ? { quantity: gift.quantity, status: gift.status } : null,
  };
}
