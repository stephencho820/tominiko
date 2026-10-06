import { notFound } from "next/navigation";
import { loadAdminProducts } from "@/services/admin-products";
import { AdminProductForm } from "@/components/AdminProductForm";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) { const { products, failed } = await loadAdminProducts((await params).id); if (failed) return <main className="admin-main"><h1>Product</h1><p role="alert">상품 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p></main>; const data = products[0]; if (!data) notFound(); return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Products / Edit</p><h1>{data.name}</h1><p>Keep this batch accurate for the shop and fulfillment.</p></div></div><AdminProductForm product={data} /></main>; }
