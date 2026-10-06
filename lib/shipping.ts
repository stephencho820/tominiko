export type DeliveryMethod = "shipping" | "local_delivery" | "pickup";
export type DeliverySettings = {
  freeShippingThreshold: number;
  standardShippingFee: number;
  localDeliveryEnabled: boolean;
  localDeliveryDays: number[];
  localDeliveryMessage: string;
};
export type AddressForEligibility = { zonecode?: string; bname?: string; roadAddress?: string; jibunAddress?: string };
export type LocalDeliveryZone = { zone_type: "postal_prefix" | "postal_range" | "district" | "address_keyword"; zone_value: string; enabled: boolean };

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  freeShippingThreshold: 50_000,
  standardShippingFee: 3_000,
  localDeliveryEnabled: true,
  localDeliveryDays: [2, 4, 6],
  localDeliveryMessage: "광교 이웃에게는 Casa di Stefano가 직접 배송해 드려요.",
};

export function calculateShippingFee(productSubtotal: number, method: DeliveryMethod, settings: DeliverySettings) {
  if (method !== "shipping") return 0;
  return productSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
}

export function calculateCheckoutTotal(productSubtotal: number, discountAmount: number, method: DeliveryMethod, settings: DeliverySettings) {
  const discountedSubtotal = Math.max(0, productSubtotal - discountAmount);
  const shippingFee = calculateShippingFee(discountedSubtotal, method, settings);
  return { productSubtotal: discountedSubtotal, discountAmount, shippingFee, finalAmount: discountedSubtotal + shippingFee };
}

export function freeShippingProgress(productSubtotal: number, settings: DeliverySettings) {
  const remaining = Math.max(0, settings.freeShippingThreshold - productSubtotal);
  return { remaining, percent: Math.min(100, settings.freeShippingThreshold ? productSubtotal / settings.freeShippingThreshold * 100 : 100), qualified: remaining === 0 };
}

export function isLocalDeliveryEligible(address: AddressForEligibility, zones: LocalDeliveryZone[], enabled = true) {
  if (!enabled) return false;
  const zonecode = (address.zonecode ?? "").replace(/\D/g, "");
  // The database matches district zones against the structured bname only.
  const district = address.bname;
  const searchableAddresses = [address.roadAddress, address.jibunAddress].filter(Boolean).map(normalizeAddressText);
  return zones.some((zone) => {
    if (!zone.enabled) return false;
    if (zone.zone_type === "postal_prefix") return Boolean(zonecode) && zonecode.startsWith(zone.zone_value.replace(/\D/g, ""));
    if (zone.zone_type === "postal_range") {
      const [start, end] = zone.zone_value.split("-").map((value) => Number(value.replace(/\D/g, "")));
      return Boolean(zonecode) && Number(zonecode) >= start && Number(zonecode) <= end;
    }
    if (zone.zone_type === "address_keyword") {
      const keyword = normalizeAddressText(zone.zone_value);
      return keyword.length >= 2 && searchableAddresses.some((addressText) => addressText.includes(keyword));
    }
    return district === zone.zone_value;
  });
}

function normalizeAddressText(value?: string) {
  return (value ?? "").normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("ko-KR");
}

export function settingsFromRow(row?: Record<string, unknown> | null): DeliverySettings {
  return {
    freeShippingThreshold: Number(row?.free_shipping_threshold ?? DEFAULT_DELIVERY_SETTINGS.freeShippingThreshold),
    standardShippingFee: Number(row?.standard_shipping_fee ?? DEFAULT_DELIVERY_SETTINGS.standardShippingFee),
    localDeliveryEnabled: row?.local_delivery_enabled === undefined ? true : Boolean(row.local_delivery_enabled),
    localDeliveryDays: Array.isArray(row?.local_delivery_days) ? row.local_delivery_days.map(Number) : DEFAULT_DELIVERY_SETTINGS.localDeliveryDays,
    localDeliveryMessage: String(row?.local_delivery_message ?? DEFAULT_DELIVERY_SETTINGS.localDeliveryMessage),
  };
}
