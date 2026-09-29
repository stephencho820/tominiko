export const pageDefinitions = {
  home: { label: "Home", path: "/", texts: {}, images: {} },
  "our-story": { label: "Philosophy", path: "/our-story", texts: {
    casa_logo_scale: ["Casa logo scale (%)", "100"], casa_logo_alt: ["Casa logo alt text", "Casa di Stefano"],
    zero_logo_scale: ["Zero Degrees logo scale (%)", "100"], zero_logo_alt: ["Zero Degrees logo alt text", "Zero Degrees"],
    tominiko_logo_scale: ["Tominiko logo scale (%)", "100"], tominiko_logo_alt: ["Tominiko logo alt text", "Tominiko"],
    philosophy_eyebrow: ["Philosophy eyebrow", "ROASTING PHILOSOPHY"], philosophy_title: ["Philosophy title", "좋은 생두가 가진 것을\n가리지 않는 로스팅."], philosophy_description: ["Philosophy description", "우리는 생두가 가진 고유한 향미를 먼저 봅니다.\n더하지 않고, 가리지 않고,\n필요한 만큼의 열과 시간만 사용합니다."],
    principle_1_number: ["Principle 1 number", "01"], principle_1_title: ["Principle 1 title", "SMALL BATCH"], principle_1_description: ["Principle 1 description", "작은 양으로 나누어 세심하게 볶습니다."],
    principle_2_number: ["Principle 2 number", "02"], principle_2_title: ["Principle 2 title", "ORIGIN FIRST"], principle_2_description: ["Principle 2 description", "산지가 가진 고유한 향미를 먼저 생각합니다."],
    principle_3_number: ["Principle 3 number", "03"], principle_3_title: ["Principle 3 title", "FRESH ROAST"], principle_3_description: ["Principle 3 description", "필요한 만큼 준비하고 신선하게 제공합니다."],
  }, images: { casa_logo: ["Casa di Stefano logo", ""], zero_logo: ["Zero Degrees logo", ""], tominiko_logo: ["Tominiko logo", ""] } },
  "tasting-room": { label: "Tasting Room", path: "/tasting-room", texts: {}, images: {} },
  "zero-degrees": { label: "Zero Degrees", path: "/zero-degrees", texts: { title: ["Hero title", "COFFEE\nROASTERS"], tagline: ["Hero tagline", "Nothing added.\nNothing hidden."], why_ko: ["Why Zero title (Korean)", "생두가 이미 가진 것을\n가리지 않는 로스팅."], why_en: ["Why Zero title (English)", "A roast that does not\nhide what the bean already has."], why_body_ko: ["Why Zero text (Korean)", "불필요한 것을 더하지 않고, 어떤 개성도 가리지 않으며, 모든 결정을 감에만 맡기지 않는다는 약속입니다."], why_body_en: ["Why Zero text (English)", "It is a promise to add nothing unnecessary, mask no character, and leave no decision to guesswork alone."], craft_title: ["Craft title", "Not automation.\nNot intuition alone."], craft_body: ["Craft text", "Data helps us understand what happened.\nExperience helps us decide what happens next."] }, images: { craft: ["Roaster / craft image", ""] } },
  shop: { label: "Shop", path: "/shop", texts: { title_ko: ["Page title (Korean)", "오늘 준비된 커피"], title_en: ["Page title (English)", "Coffee for today"], subtitle_ko: ["Subtitle (Korean)", "작은 배치로 정성스럽게 로스팅한 커피."], subtitle_en: ["Subtitle (English)", "Coffee, roasted in small batches."], collection_ko: ["Collection title (Korean)", "다른 커피"], collection_en: ["Collection title (English)", "Other coffees"] }, images: {} },
} as const;

export type PageSlug = keyof typeof pageDefinitions;
export type TextSetting = { value: string; font: "serif" | "sans" | "display"; size: string };
export type BannerPlacement = "tasting-room" | "our-story";
export type PromotionBanner = { id: string; placement: BannerPlacement; image: string; mobileImage: string; hyperlink: string; active: boolean; sortOrder: number; alt: string };
export type HeroMedia = { url: string; type: "image" | "video"; mobileUrl: string; mobileType: "image" | "video"; active: boolean; overlay: boolean };
export type GalleryImage = { id: string; url: string; alt: string; order: number };
export type TastingRoomSettings = { heroImage: string; address: string; phone: string; phoneNote: string; openingHours: string; galleryImages: GalleryImage[] };
export type PageSettings = { texts: Record<string, TextSetting>; images: Record<string, string>; heroMedia?: HeroMedia; promotions?: PromotionBanner[]; tastingRoom?: TastingRoomSettings };

export function defaultPageSettings(slug: PageSlug): PageSettings {
  const definition = pageDefinitions[slug];
  return {
    texts: Object.fromEntries(Object.entries(definition.texts).map(([key, entry]) => [key, { value: entry[1], font: "serif", size: "" }])),
    images: Object.fromEntries(Object.entries(definition.images).map(([key, entry]) => [key, entry[1]])),
    ...(slug === "tasting-room" ? {
      tastingRoom: {
        heroImage: "/images/tasting-room-banner.svg",
        address: "",
        phone: "",
        phoneNote: "",
        openingHours: "",
        galleryImages: [],
      },
    } : {}),
    ...(slug === "home" ? {
      heroMedia: { url: "/images/home-hero.svg", type: "image" as const, mobileUrl: "", mobileType: "image" as const, active: true, overlay: true },
      promotions: [
        { id: "default-tasting-room", placement: "tasting-room" as const, image: "/images/tasting-room-banner.svg", mobileImage: "/images/tasting-room-banner-mobile.svg", hyperlink: "/tasting-room", active: true, sortOrder: 0, alt: "Casa di Stefano Tasting Room" },
        { id: "default-our-story", placement: "our-story" as const, image: "/images/our-story-banner.svg", mobileImage: "/images/our-story-banner-mobile.svg", hyperlink: "/our-story", active: true, sortOrder: 1, alt: "The philosophy of Casa di Stefano" },
      ],
    } : {}),
  };
}
