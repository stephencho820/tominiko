import Link from "next/link";
import { loadAdminProducts } from "@/services/admin-products";
import { ProductDeleteButton } from "@/components/ProductDeleteButton";
import { ProductQuickActions } from "@/components/ProductQuickActions";
import { inventoryVariants, productImage } from "@/lib/products";
import { productContentReadiness } from "@/lib/product-content-readiness";

const statusLabel: Record<string, string> = {
  active: "판매 중", draft: "임시 저장", "sold-out": "품절", hidden: "비공개",
};

export default async function AdminProducts() {
  const { products, failed } = await loadAdminProducts();
  if (failed) {
    return (
      <main className="admin-main">
        <h1>상품 관리</h1>
        <p role="alert">상품 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      </main>
    );
  }

  return (
    <main className="admin-main">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">PRODUCTS</p>
          <h1>상품 관리</h1>
          <p>상품명이나 수정하기를 누르면 가격, 재고, 설명을 변경할 수 있습니다.</p>
        </div>
        <Link href="/admin/products/new" className="admin-primary-button">+ 새 상품 등록</Link>
      </div>
      <p className="admin-panel-help" style={{ marginBottom: 14 }}>
        전체 {products.length}개 상품 · 평소에는 수정하기만 사용하세요. 공개 상태나 오늘의 커피 설정은 각 상품의 '추가 관리'에 있습니다.
      </p>
      <div className="admin-product-list">
        {products.map((product) => {
          const content = productContentReadiness(product);
          const sizes = inventoryVariants(product);
          return (
            <article className="admin-product-card" key={product.id}>
              <div className="admin-product-image">
                <img src={productImage(product)} alt="" />
              </div>
              <div className="admin-product-copy">
                <div className="admin-product-title">
                  <div>
                    <Link href={"/admin/products/" + product.id}>
                      {product.korean_name || product.name}
                    </Link>
                    <p>{product.name}{product.origin ? " · " + product.origin : ""}</p>
                  </div>
                  <div className="admin-product-badges">
                    <span className="admin-badge">{statusLabel[product.status ?? "active"] ?? "상태 확인"}</span>
                    {product.todays_roast && <span className="admin-badge admin-badge-feature">오늘의 커피</span>}
                  </div>
                </div>
                <div className="admin-product-meta">
                  {sizes.map((variant) => (
                    <span key={variant.size}>
                      {variant.size} <strong>₩{(variant.salePrice ?? variant.price).toLocaleString("ko-KR")}</strong>
                      {" · "}재고 {variant.stock}
                    </span>
                  ))}
                </div>
                {!content.launchReady && (
                  <p className="admin-product-content-note">
                    필수 정보: {content.requiredMissing.map((item) => item.label).join(" · ")}
                  </p>
                )}
                <details className="admin-product-advanced">
                  <summary>추가 관리 · 판매 상태 / 오늘의 커피 / 삭제</summary>
                  <ProductQuickActions
                    id={product.id}
                    name={product.name}
                    stock={product.stock_quantity}
                    status={product.status}
                    todaysRoast={product.todays_roast}
                  />
                  <ProductDeleteButton id={product.id} name={product.name} />
                </details>
              </div>
              <div className="admin-product-menu">
                <Link href={"/admin/products/" + product.id}>수정하기</Link>
              </div>
            </article>
          );
        })}
      </div>
      {!products.length && <div className="admin-orders-empty"><strong>등록된 상품이 없습니다.</strong><span>새 상품 등록을 눌러 첫 원두를 추가하세요.</span></div>}
    </main>
  );
}
