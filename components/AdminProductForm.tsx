"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductVariant, Weight } from "@/types";
import { sizesForFormat, type ProductFormat } from "@/lib/product-contract";
import { SHOP_TAGS } from "@/lib/shop-tags";
import { inventoryVariants } from "@/lib/products";
import { validateProductForm } from "@/lib/admin-product-form";
import { ImageUpload } from "./ImageUpload";

// Keep all persisted fields in state so simplifying the editor never removes
// existing product details from the database.
const fields = [
  "name", "korean_name", "subtitle", "slug", "short_description", "product_type",
  "status", "origin", "region", "producer", "washing_station", "variety",
  "process", "altitude", "harvest", "grade", "roast_level", "tasting_notes",
  "description", "about", "why_we_chose_it", "roaster_note", "display_order",
  "image_url", "brewing_dose", "brewing_water", "brewing_temperature",
  "brewing_grind", "brewing_time",
] as const;

const initialPrices: Record<Weight, number> = { "150g": 19000, "400g": 44000, "1개입": 1800, "5개입": 7900, "10개입": 14900, "1세트": 0 };
const initialSalePrices: Record<Weight, number> = { "150g": 13000, "400g": 29000, "1개입": 1800, "5개입": 7900, "10개입": 14900, "1세트": 0 };
const makeVariant = (size: Weight): ProductVariant => ({
  id: crypto.randomUUID(), size, price: initialPrices[size], salePrice: initialSalePrices[size],
  sku: "", stock: 0, available: true,
});
function initialVariants(product?: Product): ProductVariant[] {
  const format = product?.product_format ?? "beans";
  const expected = sizesForFormat(format);
  if (!product) return expected.map(makeVariant);
  const existing = inventoryVariants(product);
  if (existing.length === expected.length) {
    return existing.map((variant) => ({ ...variant, salePrice: variant.salePrice ?? variant.price }));
  }
  if (format === "coffee_bag") {
    // Pre-existing draft coffee bags used two zero-priced options.
    return expected.map((size) => {
      const old = product.variants?.find((variant) => variant.size === size);
      const fresh = makeVariant(size);
      if (!old) return fresh;
      return { ...fresh, id: old.id, price: old.price > 0 ? old.price : fresh.price,
        salePrice: old.price > 0 ? (old.salePrice ?? old.price) : fresh.salePrice,
        stock: old.stock, available: old.available };
    });
  }
  // Preserve legacy pricing if a bean product predates the inventory migration.
  return (["150g", "400g"] as const).map((size) => {
    const base = makeVariant(size);
    const selling = size === "150g" ? product.price_150g : product.price_400g;
    const list = size === "150g" ? product.price_150g_original : product.price_400g_original;
    const salePrice = selling > 0 ? selling : base.salePrice ?? base.price;
    return { ...base, price: Math.max(list ?? 0, salePrice), salePrice,
      stock: Math.floor(Math.max(0, product.stock_quantity ?? 0) / 2) };
  });
}

function makeSlug(value: string) {
  return value.normalize("NFKC").trim().toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AdminProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    ...Object.fromEntries(fields.map((key) => [key, product?.[key as keyof Product] ?? ""])),
    product_type: product?.product_type ?? "single-origin",
    product_format: product?.product_format ?? "beans",
    status: product?.status ?? "draft",
    display_order: product?.display_order ?? 0,
    featured: product?.featured ?? false,
    todays_roast: product?.status === "active" && (product?.todays_roast ?? false),
    use_default_recipe: product?.use_default_recipe ?? true,
    acidity: product?.acidity ?? 3,
    sweetness: product?.sweetness ?? 3,
    body: product?.body ?? 3,
    discovery_tags: product?.discovery_tags ?? [],
    gallery_images: (product?.gallery_images ?? []).slice(0, 1),
    sales_channels: product?.sales_channels?.length ? product.sales_channels : ["online"],
    variants: initialVariants(product),
  }));
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);
  function onUploadingChange(uploading: boolean) {
    setUploadingCount((count) => Math.max(0, count + (uploading ? 1 : -1)));
  }

  function change(key: string, value: unknown) {
    setForm((current) => {
      const updates: Record<string, unknown> = { [key]: value };
      if (key === "name") {
        const previousName = String(current.name ?? "");
        const currentSlug = String(current.slug ?? "");
        if (!currentSlug || currentSlug === makeSlug(previousName)) {
          updates.slug = makeSlug(String(value));
        }
      }
      if (key === "status" && value !== "active") updates.todays_roast = false;
      if (key === "product_format" && value !== current.product_format) {
        updates.variants = sizesForFormat(value as ProductFormat).map(makeVariant);
        updates.todays_roast = false;
        // Keep the format tag in sync without discarding existing taste/SHOP tags.
        const tags = (current.discovery_tags as string[] | undefined) ?? [];
        updates.discovery_tags = value === "coffee_bag"
          ? [...new Set([...tags, "커피백"])]
          : tags.filter((tag) => tag !== "커피백");
      }
      return { ...current, ...updates };
    });
  }

  const input = (key: string, label: string, placeholder = "", type = "text") => (
    <label className="admin-field" key={key}>
      {label}
      <input
        type={type}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        value={String(form[key] ?? "")}
        onChange={(event) => change(key, type === "number" ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
  const area = (key: string, label: string, placeholder = "") => (
    <label className="admin-field admin-field-wide" key={key}>
      {label}
      <textarea
        rows={3}
        placeholder={placeholder}
        value={String(form[key] ?? "")}
        onChange={(event) => change(key, event.target.value)}
      />
    </label>
  );
  const selectedTags = form.discovery_tags as string[];
  const variants = form.variants as ProductVariant[];
  const channels = form.sales_channels as string[];
  const isCoffeeBag = form.product_format === "coffee_bag";
  const conceptImage = ((form.gallery_images as string[] | undefined) ?? [])[0] ?? "";
  function chooseFormat(value: ProductFormat) {
    if (form.product_format === value) return;
    if (product && !window.confirm("판매 형태를 변경하면 기존 옵션과 재고가 새 형식으로 초기화됩니다. 변경할까요?")) return;
    change("product_format", value);
  }

  function toggleShopTag(tag: string) {
    change("discovery_tags", selectedTags.includes(tag)
      ? selectedTags.filter((value) => value !== tag)
      : [...selectedTags, tag]);
  }
  function setVariant(index: number, key: keyof ProductVariant, value: unknown) {
    change("variants", variants.map((variant, currentIndex) =>
      index === currentIndex ? { ...variant, [key]: value } : variant));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!channels.length) {
      setMessage("판매 채널을 하나 이상 선택해 주세요. (아래 '추가 운영 설정')");
      return;
    }
    if (uploadingCount > 0) {
      setMessage("사진 업로드가 완료된 후 상품을 저장해 주세요.");
      return;
    }
    const invalid = validateProductForm(form);
    if (invalid) { setMessage(invalid); return; }

    savingRef.current = true;
    setSaving(true);
    setMessage("");
    const payload = {
      ...form,
      // The coffee-bag tag is automatic, including when editing older draft records.
      discovery_tags: isCoffeeBag
        ? [...new Set([...selectedTags, "커피백"])]
        : selectedTags.filter((tag) => tag !== "커피백"),
      gallery_images: conceptImage ? [conceptImage.trim()] : [],
    };
    try {
      const response = await fetch("/api/admin/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product ? { id: product.id, ...payload } : payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "상품을 저장하지 못했습니다.");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setMessage("상품을 저장하지 못했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form noValidate className="admin-product-form" onSubmit={save}>
      <p className="admin-panel-help">
        상품명 → 가격·재고 → 커피 정보 → 사진 순서로 입력하세요.
        농장·추출법·노출 설정처럼 자주 바꾸지 않는 항목은 맨 아래에 모아두었습니다.
      </p>
      {product && (
        <div className="admin-preview">
          <Link href={"/shop/" + product.slug + "?preview=1"} target="_blank">
            상품 상세 미리보기 ↗
          </Link>
        </div>
      )}

      <section className="admin-panel admin-form-priority">
        <p className="eyebrow">01 · BASIC</p>
        <h2>상품 기본 정보</h2>
        <p className="admin-panel-help">상품명과 간단한 소개를 작성하고, SHOP에서 노출할 분류를 선택하세요.</p>
        <div className="admin-form-grid">
          {input("name", "상품명 *", "예: Ethiopia Yirgacheffe")}
          {input("korean_name", "한글 상품명", "예: 에티오피아 예가체프")}
          <label className="admin-field">
            판매 형태 *
            <select value={String(form.product_format)} onChange={(event) => chooseFormat(event.target.value as ProductFormat)}>
              <option value="beans">원두 · 150g / 400g</option>
              <option value="coffee_bag">커피백 · 1개입 / 5개입 / 10개입</option>
            </select>
          </label>
          <label className="admin-field">
            커피 종류
            <select value={String(form.product_type)} onChange={(event) => change("product_type", event.target.value)}>
              <option value="single-origin">싱글 오리진</option>
              <option value="blend">블렌드</option>
              <option value="decaf">디카페인</option>
            </select>
          </label>
          <label className="admin-field">
            판매 상태
            <select value={String(form.status ?? "draft")} onChange={(event) => change("status", event.target.value)}>
              <option value="draft">임시 저장 (고객에게 숨김)</option>
              <option value="active">판매 중</option>
              <option value="sold-out">품절</option>
              <option value="hidden">비공개</option>
            </select>
          </label>
          {area("short_description", "한 줄 소개 · 상품 카드 / 상세 상단", "예: 꽃향기와 시트러스의 산뜻한 여운")}
        </div>
        <p className="admin-panel-help">SHOP 카테고리 (복수 선택 가능){isCoffeeBag ? " · 커피백 분류는 자동으로 적용됩니다." : ""}</p>
        <div className="admin-tag-picker">
          {SHOP_TAGS.map((tag) => (
            <button
              type="button"
              key={tag}
              aria-pressed={selectedTags.includes(tag)}
              onClick={() => toggleShopTag(tag)}
            >
              <span className="admin-tag-check" aria-hidden="true">{selectedTags.includes(tag) ? "✓" : ""}</span>
              <span><strong>{tag}</strong></span>
            </button>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <p className="eyebrow">02 · PRICE & STOCK</p>
        <h2>가격과 재고</h2>
        <p className="admin-panel-help">
          정상가와 실제 판매가가 같으면 할인 표시가 없습니다.
          재고는 각 {isCoffeeBag ? "구성별" : "용량별"}로 입력하고, 판매하지 않는 옵션은 '판매 가능'을 해제하세요.
        </p>
        <div className="variant-price-editor">
          {variants.map((variant, index) => (
            <div className="admin-form-grid" key={variant.id}>
              <strong className="admin-field-wide">{variant.size}</strong>
              {(["price", "salePrice", "stock"] as const).map((key) => (
                <label className="admin-field" key={key}>
                  {key === "price" ? "정상가 (원)" : key === "salePrice" ? "실제 판매가 (원)" : "재고 (개)"}
                  <input
                    type="number"
                    min={key === "stock" ? 0 : 1}
                    step={1}
                    value={variant[key] ?? variant.price}
                    onChange={(event) => setVariant(index, key, Number(event.target.value))}
                  />
                </label>
              ))}
              <label className="admin-checkbox">
                <input type="checkbox" checked={variant.available} onChange={(event) => setVariant(index, "available", event.target.checked)} />
                {" "}이 옵션 판매 가능
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <p className="eyebrow">03 · COFFEE & STORY</p>
        <h2>커피 정보와 상세 설명</h2>
        <p className="admin-panel-help">
          여기 입력한 내용이 상품 상세 페이지의 THE COFFEE, IN THE CUP, OUR NOTE에 표시됩니다.
        </p>
        <div className="admin-form-grid">
          {input("origin", "원산지 (필수) *", "예: Ethiopia / Brazil · Colombia")}
          {input("grade", "등급", "예: G1 / AA")}
          {input("process", "가공 방식", "예: Washed / Natural")}
          {input("roast_level", "로스팅 정도", "예: Medium")}
          {area("tasting_notes", "IN THE CUP · 맛 노트", "예: 밀크 초콜릿, 구운 아몬드, 캐러멜")}
          {area("about", "ABOUT THIS COFFEE · 커피 소개", "이 원두의 특징을 자연스럽게 소개해 주세요.")}
          {area("why_we_chose_it", "WHY WE CHOSE IT · 선택한 이유", "Casa di Stefano가 이 커피를 선택한 이유")}
          {area("roaster_note", "ROASTER'S NOTE · 로스터의 한마디", "추천하는 맛의 포인트나 여운")}
        </div>
        <details className="admin-form-advanced admin-lot-details">
          <summary>선택 입력 · 농장 / 세부 산지 정보</summary>
          <p className="admin-panel-help">정보가 있을 때만 작성하세요. 비워두어도 상품 저장에 문제없습니다.</p>
          <div className="admin-form-grid">
            {input("region", "세부 지역", "예: Yirgacheffe")}
            {input("producer", "농장 / 생산자")}
            {input("washing_station", "워싱 스테이션")}
            {input("variety", "품종")}
            {input("altitude", "재배 고도")}
            {input("harvest", "수확 시기")}
          </div>
        </details>
      </section>

      <section className="admin-panel">
        <p className="eyebrow">04 · PHOTOS</p>
        <h2>상품 사진 (최대 2장)</h2>
        <p className="admin-panel-help">
          대표사진은 SHOP의 첫 화면에, 콘셉트사진은 상품 상세의 두 번째 사진에 표시됩니다.
          PC에서는 상품 카드에 마우스를 올리면 콘셉트사진을 보여줍니다.
        </p>
        <div className="admin-product-photos-grid">
          <div className="admin-product-photo-slot">
            <strong>01 · 대표사진</strong>
            <div className="admin-product-photo-preview">
              {form.image_url ? <img src={String(form.image_url)} alt="현재 대표사진" /> : <span>첫 번째 사진</span>}
            </div>
            <ImageUpload label={form.image_url ? "대표사진 교체" : "대표사진 업로드"} onUploaded={(url) => change("image_url", url)} onUploadingChange={onUploadingChange} />
            {Boolean(form.image_url) && <button type="button" className="admin-photo-remove" onClick={() => change("image_url", "")}>대표사진 제거</button>}
          </div>
          <div className="admin-product-photo-slot">
            <strong>02 · 콘셉트사진 (선택)</strong>
            <div className="admin-product-photo-preview">
              {conceptImage ? <img src={conceptImage} alt="현재 콘셉트사진" /> : <span>두 번째 사진</span>}
            </div>
            <ImageUpload label={conceptImage ? "콘셉트사진 교체" : "콘셉트사진 업로드"} onUploaded={(url) => change("gallery_images", [url])} onUploadingChange={onUploadingChange} />
            {Boolean(conceptImage) && <button type="button" className="admin-photo-remove" onClick={() => change("gallery_images", [])}>콘셉트사진 제거</button>}
          </div>
        </div>
        <details className="admin-form-advanced">
          <summary>선택 입력 · 사진 URL 직접 입력</summary>
          <div className="admin-form-grid">
            {input("image_url", "대표사진 URL")}
            <label className="admin-field">
              콘셉트사진 URL
              <input type="url" value={conceptImage} placeholder="https://..." onChange={(event) => change("gallery_images", event.target.value.trim() ? [event.target.value] : [])} />
            </label>
          </div>
        </details>
      </section>

      <details className="admin-form-advanced">
        <summary>추가 운영 설정 · 노출 / 판매 채널 / 추출 레시피</summary>
        <p className="admin-panel-help">대부분의 상품은 기본값 그대로 사용해도 됩니다.</p>
        <div className="admin-form-grid">
          {input("slug", "상품 주소 (URL)", "상품명 입력 시 자동 생성")}
          {input("subtitle", "영문 부제목 (선택)")}
          {input("display_order", "상품 노출 순서", "0", "number")}
        </div>
        <div className="admin-toggle-row">
          <label>
            <input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => change("featured", event.target.checked)} />
            <span><strong>추천 상품으로 노출</strong></span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(form.todays_roast)}
              disabled={isCoffeeBag || form.status !== "active" || variants.reduce((sum, variant) => sum + variant.stock, 0) <= 0}
              onChange={(event) => change("todays_roast", event.target.checked)}
            />
            <span><strong>오늘의 커피</strong><small>판매 중이며 재고가 있어야 선택 가능</small></span>
          </label>
        </div>
        <p className="admin-panel-help">판매 채널</p>
        <div className="admin-toggle-row">
          {([["online", "온라인 SHOP"], ["tasting_room", "테이스팅룸 원두"]] as const).map(([value, label]) => (
            <label key={value}>
              <input
                type="checkbox"
                checked={channels.includes(value)}
                onChange={(event) => change("sales_channels", event.target.checked
                  ? [...channels, value] : channels.filter((channel) => channel !== value))}
              />
              <span><strong>{label}</strong></span>
            </label>
          ))}
        </div>
        <div className="admin-form-grid">
          {(["acidity", "sweetness", "body"] as const).map((key) => (
            <label className="admin-field" key={key}>
              {key === "acidity" ? "산미" : key === "sweetness" ? "단맛" : "바디감"} · {String(form[key])}/5
              <input type="range" min={1} max={5} value={Number(form[key])} onChange={(event) => change(key, Number(event.target.value))} />
            </label>
          ))}
        </div>
        <label className="admin-checkbox">
          <input type="checkbox" checked={Boolean(form.use_default_recipe)} onChange={(event) => change("use_default_recipe", event.target.checked)} />
          {" "}Casa 기본 추출 레시피 사용
        </label>
        {!form.use_default_recipe && (
          <div className="admin-form-grid">
            {input("brewing_dose", "원두량")}
            {input("brewing_water", "물 양")}
            {input("brewing_temperature", "물 온도")}
            {input("brewing_grind", "분쇄도")}
            {input("brewing_time", "추출 시간")}
          </div>
        )}
      </details>

      {message && <p role="alert" className="admin-form-error">{message}</p>}
      <div className="admin-form-submit">
        <button className="admin-primary-button" type="submit" disabled={saving || uploadingCount > 0}>
          {uploadingCount > 0 ? "사진 업로드 중…" : saving ? "저장 중…" : product ? "변경사항 저장" : "상품 등록"}
        </button>
      </div>
    </form>
  );
}
