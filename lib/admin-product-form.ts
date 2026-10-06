import type { ProductVariant } from "@/types";

export function validateProductForm(form: Record<string, unknown>): string | null {
  for (const [key, label] of [["name", "상품명"], ["slug", "Slug"], ["origin", "국가 / 원산지"], ["product_type", "상품 유형"], ["category", "카테고리"], ["status", "상태"]]) {
    if (typeof form[key] !== "string" || !String(form[key]).trim()) return `${label}을(를) 입력해 주세요.`;
  }
  if (!["single-origin", "blend", "decaf"].includes(String(form.product_type))) return "올바른 상품 유형을 선택해 주세요.";
  if (!["comfortable", "bright", "decaf", "blend", "special"].includes(String(form.category))) return "올바른 카테고리를 선택해 주세요.";
  if (!["draft", "active", "sold-out", "hidden"].includes(String(form.status))) return "올바른 상태를 선택해 주세요.";
  const variants = form.variants as ProductVariant[];
  if (!Array.isArray(variants) || variants.length !== 2 || new Set(variants.map(v => v.size)).size !== 2 || variants.some(v => !["150g", "400g"].includes(v.size))) return "150g / 400g 재고 옵션이 각각 하나씩 필요합니다.";
  for (const variant of variants) {
    if (!Number.isSafeInteger(variant.price) || variant.price <= 0 || variant.price > 2147483647) return `${variant.size} 정상가는 0보다 큰 정수여야 합니다.`;
    if (!Number.isSafeInteger(variant.salePrice) || Number(variant.salePrice) <= 0) return `${variant.size} 판매가는 0보다 큰 정수여야 합니다.`;
    if (Number(variant.salePrice) > variant.price) return `${variant.size} 판매가는 정상가보다 높을 수 없습니다.`;
    if (!Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 2147483647) return `${variant.size} 재고는 0 이상의 정수여야 합니다.`;
  }
  if (form.todays_roast && (form.status !== "active" || variants.reduce((sum, variant) => sum + variant.stock, 0) <= 0)) return "오늘의 로스트는 Active 상태이며 재고가 있는 상품만 선택할 수 있습니다.";
  return null;
}
