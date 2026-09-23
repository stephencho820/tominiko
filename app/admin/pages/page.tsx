import Link from "next/link";
import { pageDefinitions } from "@/lib/page-content-config";

export default function PagesAdmin() {
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Website content</p><h1>Pages</h1><p>Edit text, typography and photography without changing code.</p></div></div><div className="admin-pages-grid">{Object.entries(pageDefinitions).map(([slug, page]) => <Link className="admin-panel" href={`/admin/pages/${slug}`} key={slug}><span className="eyebrow">{page.path}</span><h2>{page.label}</h2><p className="admin-muted">Edit page →</p></Link>)}</div></main>;
}
