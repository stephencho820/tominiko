type ContentSource = {
  image_url?: unknown;
  gallery_images?: unknown;
  gallery_images_text?: unknown;
  tasting_notes?: unknown;
  discovery_tags?: unknown;
  origin?: unknown;
  region?: unknown;
  variety?: unknown;
  grade?: unknown;
  process?: unknown;
  roasted_date?: unknown;
  short_description?: unknown;
  description?: unknown;
  about?: unknown;
  why_we_chose_it?: unknown;
  roaster_note?: unknown;
  use_default_recipe?: unknown;
  brewing_dose?: unknown;
  brewing_water?: unknown;
  brewing_temperature?: unknown;
  brewing_grind?: unknown;
  brewing_time?: unknown;
};

export type ProductContentCheck = {
  key: string;
  label: string;
  complete: boolean;
  required: boolean;
};

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const hasList = (value: unknown) => Array.isArray(value) && value.some((item) => hasText(item));

export function productContentReadiness(source: ContentSource) {
  const customRecipeReady = [
    source.brewing_dose,
    source.brewing_water,
    source.brewing_temperature,
    source.brewing_grind,
    source.brewing_time,
  ].every(hasText);

  const galleryReady = hasList(source.gallery_images)
    || (typeof source.gallery_images_text === "string" && source.gallery_images_text.split("\n").some((item) => item.trim()));

  const checks: ProductContentCheck[] = [
    { key: "image", label: "대표 이미지", complete: hasText(source.image_url), required: true },
    { key: "taste", label: "테이스팅 노트", complete: hasText(source.tasting_notes), required: true },
    { key: "tags", label: "Shop Tag", complete: hasList(source.discovery_tags), required: true },
    { key: "facts", label: "기본 원두 정보", complete: [source.origin, source.grade, source.process].every(hasText), required: true },
    { key: "roast-date", label: "로스팅 날짜", complete: hasText(source.roasted_date), required: true },
    { key: "description", label: "한 줄 소개", complete: hasText(source.short_description) || hasText(source.description), required: true },
    { key: "about", label: "About This Coffee", complete: hasText(source.about), required: false },
    { key: "why", label: "Why We Chose It", complete: hasText(source.why_we_chose_it), required: false },
    { key: "roaster-note", label: "Roaster's Note", complete: hasText(source.roaster_note), required: false },
    { key: "brew", label: "Brewing Guide", complete: source.use_default_recipe !== false || customRecipeReady, required: false },
    { key: "gallery", label: "Gallery 이미지", complete: galleryReady, required: false },
  ];

  const completed = checks.filter((check) => check.complete).length;
  const requiredMissing = checks.filter((check) => check.required && !check.complete);
  const recommendedMissing = checks.filter((check) => !check.required && !check.complete);

  return {
    checks,
    score: Math.round((completed / checks.length) * 100),
    launchReady: requiredMissing.length === 0,
    requiredMissing,
    recommendedMissing,
  };
}
