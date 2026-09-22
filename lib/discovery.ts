export const DISCOVERY_TAGS = [
  { value: "todays-roast", ko: "오늘의 커피", en: "Today's Roast", reasonKo: "오늘 로스터리가 가장 자신 있게 권하는 한 잔이에요.", reasonEn: "The cup our roastery recommends today." },
  { value: "nutty-comforting", ko: "고소하고 편안한", en: "Nutty & Comforting", reasonKo: "고소한 단맛과 편안한 균형을 원할 때 잘 맞아요.", reasonEn: "For an easy cup with nutty sweetness and balance." },
  { value: "bright-fruity", ko: "화사하고 산뜻한", en: "Bright & Fruity", reasonKo: "과일처럼 맑고 생기 있는 향미를 즐기기 좋아요.", reasonEn: "A lively choice with clear, fruit-led flavours." },
  { value: "decaf", ko: "디카페인", en: "Decaf", reasonKo: "카페인 부담은 덜고 커피의 풍미는 그대로 즐겨요.", reasonEn: "Full coffee character, with less caffeine." },
  { value: "morning-boost", ko: "아침을 깨우는", en: "Morning Boost", reasonKo: "하루의 시작을 또렷하게 열어주는 커피예요.", reasonEn: "A clear, confident start to the day." },
  { value: "something-special", ko: "특별한 날", en: "Something Special", reasonKo: "천천히 음미하고 싶은 날을 위한 특별한 커피예요.", reasonEn: "A distinctive cup worth slowing down for." },
  { value: "for-gifting", ko: "선물하기 좋은", en: "For Gifting", reasonKo: "누구에게 건네도 기분 좋은 인상과 균형을 담았어요.", reasonEn: "A beautifully balanced coffee made to share." },
  { value: "easy-brewing", ko: "간편하게 즐기는", en: "Easy Brewing", reasonKo: "도구와 레시피에 구애받지 않고 맛있게 즐기기 좋아요.", reasonEn: "Forgiving and delicious across everyday brewers." },
] as const;

export type DiscoveryTag = (typeof DISCOVERY_TAGS)[number]["value"];

/** Product matching is intentionally metadata-driven: origin is display data, never a rule. */
export function hasDiscoveryTag(productTags: readonly string[] | null | undefined, tag: DiscoveryTag) {
  return productTags?.includes(tag) ?? false;
}
