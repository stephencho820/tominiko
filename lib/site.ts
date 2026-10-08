export const SITE_NAME = "Casa di Stefano";
export const SITE_TITLE = "Casa di Stefano | Tominiko Beans & Coffee";
export const SITE_DESCRIPTION = "수원에서 Zero Degrees가 로스팅하는 Tominiko 커피와 Casa di Stefano Tasting Room.";
export const SITE_LOCALE = "ko_KR";

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export const BUSINESS_INFO = {
  displayName: "Casa di Stefano",
  productBrand: "Tominiko Beans & Coffee",
  roaster: "Zero Degrees",
  address: "경기 수원시 장안구 연무동 238-38",
  phone: "010-9093-0820",
  representative: "",
  businessRegistrationNumber: "",
  mailOrderRegistrationNumber: "",
  email: "",
} as const;

export const POLICY_EFFECTIVE_DATE = "2026-10-08";
