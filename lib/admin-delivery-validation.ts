export function isUUID(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function validateDeliverySettings(body: Record<string, unknown>) {
  const { freeShippingThreshold, standardShippingFee, localDeliveryEnabled, localDeliveryDays, localDeliveryMessage } = body;
  if (typeof freeShippingThreshold !== "number" || !Number.isSafeInteger(freeShippingThreshold) || freeShippingThreshold < 0
    || typeof standardShippingFee !== "number" || !Number.isSafeInteger(standardShippingFee) || standardShippingFee < 0) {
    return { error: "배송비와 무료배송 기준은 0 이상의 정수로 입력해 주세요." } as const;
  }
  if (typeof localDeliveryEnabled !== "boolean" || !Array.isArray(localDeliveryDays)
    || localDeliveryDays.some((day) => typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6)) {
    return { error: "배송 요일은 0~6 사이의 정수만 허용됩니다." } as const;
  }
  if (typeof localDeliveryMessage !== "string" || localDeliveryMessage.length > 500) {
    return { error: "안내 문구는 500자 이내로 입력해 주세요." } as const;
  }
  return { data: {
    id: true, free_shipping_threshold: freeShippingThreshold, standard_shipping_fee: standardShippingFee,
    local_delivery_enabled: localDeliveryEnabled, local_delivery_days: [...new Set(localDeliveryDays)] as number[],
    local_delivery_message: localDeliveryMessage,
  } } as const;
}

export function validateDeliveryZone(body: Record<string, unknown>) {
  if (typeof body.name !== "string" || !body.name.trim()) return { error: "지역명을 입력해 주세요." } as const;
  if (typeof body.zoneValue !== "string") return { error: "올바른 지역 값을 입력해 주세요." } as const;
  const value = body.zoneValue.trim();
  const type = body.zoneType;
  const valid = type === "district" || type === "address_keyword" ? value.length >= 2
    : type === "postal_prefix" ? /^\d{1,5}$/.test(value)
    : type === "postal_range" ? /^\d{5}-\d{5}$/.test(value) && value.slice(0, 5) <= value.slice(6)
    : false;
  if (!valid) return { error: "지역 값 형식을 확인해 주세요. 우편번호 범위는 12345-12399 형식이어야 합니다." } as const;
  return { data: { name: body.name.trim(), zone_type: type as string, zone_value: value, enabled: true } } as const;
}
