import type { ProductVariant } from "@/types";
import { sizesForFormat, type ProductFormat } from "@/lib/product-contract";

export function validateProductForm(form: Record<string, unknown>): string | null {
  for (const [key, label] of [["name", "상품명"], ["slug", "Slug"], ["origin", "국가 / 원산지"], ["product_type", "상품 유형"], ["status", "상태"]]) {
    if (typeof form[key] !== "string" || !String(form[key]).trim()) return `${label}을(를) 입력해 주세요.`;
  }
  const format = form.product_format as ProductFormat;
  if (!["beans", "coffee_bag"].includes(format)) return "판매 형태를 선택해 주세요.";
  if (!["single-origin", "blend", "decaf"].includes(String(form.product_type))) return "올바른 상품 유형을 선택해 주세요.";
  if (!["draft", "active", "sold-out", "hidden"].includes(String(form.status))) return "올바른 상태를 선택해 주세요.";
  const expected = sizesForFormat(format);
  const variants = form.variants as ProductVariant[];
  if (!Array.isArray(variants) || variants.length !== expected.length || new Set(variants.map(v => v.size)).size !== expected.length || variants.some(v => !expected.includes(v.size))) return `${expected.join(" / ")} 재고 옵션이 각각 하나씩 필요합니다.`;
  for (const variant of variants) {
    if (!Number.isSafeInteger(variant.price) || variant.price <= 0 || variant.price > 2147483647) return `${variant.size} 정상가는 0보다 큰 정수여야 합니다.`;
    if (!Number.isSafeInteger(variant.salePrice) || Number(variant.salePrice) <= 0) return `${variant.size} 판매가는 0보다 큰 정수여야 합니다.`;
    if (Number(variant.salePrice) > variant.price) return `${variant.size} 판매가는 정상가보다 높을 수 없습니다.`;
    if (!Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 2147483647) return `${variant.size} 재고는 0 이상의 정수여야 합니다.`;
  }
  const gallery = form.gallery_images;
  if (gallery !== undefined && (!Array.isArray(gallery) || gallery.length > 1 || gallery.some((url) => typeof url !== "string" || !url.trim()))) return "콘셉트사진은 1장만 등록할 수 있습니다.";
  if (Array.isArray(gallery) && gallery.length > 0 && typeof form.image_url === "string" && gallery[0] === form.image_url) return "대표사진과 콘셉트사진에 서로 다른 사진을 선택해 주세요.";
  if (form.todays_roast && (format === "coffee_bag" || form.status !== "active" || variants.reduce((sum, variant) => sum + variant.stock, 0) <= 0)) return "오늘의 로스트는 Active 상태의 원두 상품 중 재고가 있는 상품만 선택할 수 있습니다.";
  return null;
}
