import { validateVariants } from "@/lib/product-contract";
import type { ProductVariant } from "@/types";

export function validateProductForm(form: Record<string, unknown>): string | null {
  for (const [key, label] of [["name", "상품명"], ["slug", "Slug"], ["origin", "국가 / 원산지"], ["product_type", "상품 유형"], ["status", "상태"]]) {
    if (typeof form[key] !== "string" || !String(form[key]).trim()) return `${label}을(를) 입력해 주세요.`;
  }
  if (!["single-origin", "blend", "decaf"].includes(String(form.product_type))) return "올바른 상품 유형을 선택해 주세요.";
  if (!["draft", "active", "sold-out", "hidden"].includes(String(form.status))) return "올바른 상태를 선택해 주세요.";
  const format = form.product_format === "coffee_bag" ? "coffee_bag" : "beans";
  const isDraft = ["draft", "hidden"].includes(String(form.status));
  const variants = form.variants as ProductVariant[];
  try { validateVariants(variants, format, format === "coffee_bag" && isDraft); }
  catch { return format === "coffee_bag" ? "커피백 5개입 / 10개입 옵션의 가격과 재고를 확인해 주세요. 판매 전까지는 0원, 0개, 판매 불가로 유지하세요." : "150g / 400g 옵션의 가격과 재고를 확인해 주세요."; }
  if (form.todays_roast && (format === "coffee_bag" || form.status !== "active" || variants.reduce((sum, variant) => sum + variant.stock, 0) <= 0)) return "오늘의 로스트는 재고가 있는 Active 원두만 선택할 수 있습니다.";
  return null;
}
