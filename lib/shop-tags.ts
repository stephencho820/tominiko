export const SHOP_TAGS = [
  "고소하고 편안한",
  "화사하고 산뜻한",
  "디카페인",
  "블렌드",
  "특별한 날",
] as const;

export type ShopTag = (typeof SHOP_TAGS)[number];

export function isShopTag(value: string | null): value is ShopTag {
  return SHOP_TAGS.some((tag) => tag === value);
}
