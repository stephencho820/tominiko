export const pageDefinitions = {
  home: { label: "Home", path: "/", texts: {}, images: {} },
  "our-story": { label: "Our Story", path: "/our-story", texts: { title_ko: ["Title (Korean)", "하나의 집,\n세 가지 역할."], title_en: ["Title (English)", "One house.\nThree ways of seeing coffee."], intro_ko: ["Introduction (Korean)", "이름은 다르지만, 세계관은 하나입니다."], intro_en: ["Introduction (English)", "Different names, one shared point of view."], explanation_ko: ["Explanation (Korean)", "Casa di Stefano는 우리가 머무는 집입니다. Zero Degrees는 그 안에서 커피를 대하는 방식이고, Tominiko는 그 결과를 당신의 하루에 건네는 이름입니다."], explanation_en: ["Explanation (English)", "Casa di Stefano is the house we inhabit. Zero Degrees is how we approach coffee inside it. Tominiko is the name we give to what you bring into your day."], closing: ["Closing statement", "Good beans.\nLess intervention."] }, images: { opening: ["Opening background image", ""] } },
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
        { id: "default-our-story", placement: "our-story" as const, image: "/images/our-story-banner.svg", mobileImage: "/images/our-story-banner-mobile.svg", hyperlink: "/our-story", active: true, sortOrder: 1, alt: "The story and philosophy of Casa di Stefano" },
      ],
    } : {}),
  };
}
