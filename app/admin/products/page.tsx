import Link from "next/link";
import { getProducts } from "@/services/products";
import { ProductDeleteButton } from "@/components/ProductDeleteButton";
import { ProductQuickActions } from "@/components/ProductQuickActions";
import { StatusBadge } from "@/components/AdminStatusBadge";
import { stockState } from "@/lib/admin";

export default async function AdminProducts() {
  const products = await getProducts();
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Coffee & inventory</p><h1>Products</h1><p>Update the details that change from batch to batch.</p></div><Link href="/admin/products/new" className="admin-primary-button">New product</Link></div><div className="admin-product-list">{products.map((product) => { const stock = stockState(product); return <article className="admin-product-card" key={product.id}><div className="admin-product-image">{product.image_url ? <img src={product.image_url} alt="" /> : <span>{product.name.charAt(0)}</span>}</div><div className="admin-product-copy"><div className="admin-product-title"><div><Link href={`/admin/products/${product.id}`}>{product.name}</Link><p>{product.origin}{product.roasted_date ? ` · Roasted ${product.roasted_date}` : " · Roast date not set"}</p></div><div className="admin-product-badges">{product.todays_roast && <span className="admin-badge admin-badge-feature">Today’s roast</span>}<StatusBadge type="stock" value={stock.label} />{!product.active && <span className="admin-badge">Inactive</span>}</div></div><div className="admin-product-meta"><span>150g <strong>₩{product.price_150g.toLocaleString()}</strong></span><span>300g <strong>₩{product.price_300g.toLocaleString()}</strong></span></div><ProductQuickActions id={product.id} name={product.name} stock={product.stock_quantity} active={product.active} todaysRoast={product.todays_roast} /></div><div className="admin-product-menu"><Link href={`/admin/products/${product.id}`}>Edit details</Link><ProductDeleteButton id={product.id} /></div></article>; })}</div></main>;
}
