export const MEMBERSHIP_TIERS = [
  { id: "general", name: "일반 멤버", shortName: "일반" },
  { id: "bronze", name: "BRONZE MEMBER", shortName: "BRONZE" },
  { id: "silver", name: "SILVER MEMBER", shortName: "SILVER" },
  { id: "gold", name: "GOLD MEMBER", shortName: "GOLD" },
  { id: "zero_black", name: "ZERO BLACK", shortName: "ZERO BLACK" },
] as const;

export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number]["id"];

/** Older VIP and PRIVATE members retain Gold privileges during migration. */
export function normalizeMembershipTier(tier?: string | null): MembershipTier {
  if (tier === "vip" || tier === "private") return "gold";
  if (tier === "bronze" || tier === "silver" || tier === "gold" || tier === "zero_black") return tier;
  return "general";
}

/** Only Gold / Zero Black have automatic shipping-fee waivers today. */
export function hasMemberFreeShipping(tier?: string | null): boolean {
  const normalized = normalizeMembershipTier(tier);
  return normalized === "gold" || normalized === "zero_black";
}

export function membershipDisplay(tier?: string | null) {
  const normalized = normalizeMembershipTier(tier);
  return MEMBERSHIP_TIERS.find((item) => item.id === normalized)!;
}
