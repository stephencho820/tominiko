import { notFound } from "next/navigation";
import { PageContentEditor } from "@/components/PageContentEditor";
import { getAdminPageSettings } from "@/lib/page-content";
import { pageDefinitions, type PageSlug } from "@/lib/page-content-config";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  if (!Object.hasOwn(pageDefinitions, rawSlug)) notFound();
  const slug = rawSlug as PageSlug;
  const result = await getAdminPageSettings(slug);
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">Website content</p><h1>{pageDefinitions[slug].label}</h1><p>Changes become visible as soon as you save.</p></div></div>{result.status === "error" ? <p role="alert">페이지 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : <>{result.status === "missing" && <p role="status">아직 저장된 페이지 설정이 없습니다. 기본값으로 시작합니다.</p>}<PageContentEditor slug={slug} initial={result.settings} /></>}</main>;
}
