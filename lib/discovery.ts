import type { ShopTag } from "@/lib/shop-tags";

export const DISCOVERY_TAGS = [
  { value: "todays-roast", ko: "오늘의 커피", en: "Today's Roast", reasonKo: "오늘 로스터리가 가장 자신 있게 권하는 한 잔이에요.", reasonEn: "The cup our roastery recommends today." },
  { value: "고소하고 편안한", ko: "고소하고 편안한", en: "Nutty & Comforting", reasonKo: "고소한 단맛과 편안한 균형을 원할 때 잘 맞아요.", reasonEn: "For an easy cup with nutty sweetness and balance." },
  { value: "화사하고 산뜻한", ko: "화사하고 산뜻한", en: "Bright & Fruity", reasonKo: "과일처럼 맑고 생기 있는 향미를 즐기기 좋아요.", reasonEn: "A lively choice with clear, fruit-led flavours." },
  { value: "디카페인", ko: "디카페인", en: "Decaf", reasonKo: "카페인 부담은 덜고 커피의 풍미는 그대로 즐겨요.", reasonEn: "Full coffee character, with less caffeine." },
  { value: "블렌드", ko: "블렌드", en: "Blend", reasonKo: "여러 산지의 장점을 균형 있게 담은 편안한 커피예요.", reasonEn: "A balanced cup built from the strengths of several origins." },
  { value: "특별한 날", ko: "특별한 날", en: "Something Special", reasonKo: "천천히 음미하고 싶은 날을 위한 특별한 커피예요.", reasonEn: "A distinctive cup worth slowing down for." },
] as const;

export type DiscoveryTag = "todays-roast" | ShopTag;

export function hasDiscoveryTag(productTags: unknown, tag: DiscoveryTag) {
  if (tag === "todays-roast") return false;
  return Array.isArray(productTags)
    && productTags.every((value): value is string => typeof value === "string")
    && productTags.includes(tag);
}
