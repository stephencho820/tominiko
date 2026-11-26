import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { formatTextPostDate } from "@/lib/text-posts";

export default async function AdminTextsPage() {
  const client = await getAdminClient();
  if (!client) redirect("/login?next=%2Fadmin%2Ftexts");
  const { data, error } = await client.from("text_posts")
    .select("id,title,published_at,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <section>
      <div className="admin-page-heading">
        <h1>글 관리</h1>
        <div className="admin-quick">
          <Link className="admin-primary-button" href="/admin/texts/new">새 글 쓰기</Link>
          <Link className="admin-text-link self-center" href="/texts">공개 글 목록</Link>
        </div>
      </div>
      {error ? <p role="alert">글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : (
        <ul className="admin-order-list">
          {data.length === 0 && <li className="admin-empty">작성한 글이 없습니다.</li>}
          {data.map((post) => (
            <li key={post.id}>
              <Link className="admin-order-card flex flex-wrap justify-between gap-3" href={`/admin/texts/${post.id}`}>
                <strong className="break-all">{post.title}</strong>
                <span className="admin-muted">{post.published_at ? "공개" : "임시 저장"} · {formatTextPostDate(post.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
