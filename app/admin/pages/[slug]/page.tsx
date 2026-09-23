import { notFound } from "next/navigation";
import { PageContentEditor } from "@/components/PageContentEditor";
import { getPageSettings } from "@/lib/page-content";
import { pageDefinitions, type PageSlug } from "@/lib/page-content-config";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  if (!(rawSlug in pageDefinitions)) notFound();
  const slug = rawSlug as PageSlug;
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Website content</p><h1>{pageDefinitions[slug].label}</h1><p>Changes become visible as soon as you save.</p></div></div><PageContentEditor slug={slug} initial={await getPageSettings(slug)} /></main>;
}
