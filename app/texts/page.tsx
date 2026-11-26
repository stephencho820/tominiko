import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { formatTextPostDate, type TextPost } from "@/lib/text-posts";
import styles from "./texts.module.css";

export const metadata = { title: "Texts" };
const pageSize = 20;

export default async function TextsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const offset = (page - 1) * pageSize;
  let posts: Pick<TextPost, "id" | "title" | "summary" | "published_at">[] = [];
  let unavailable = !hasSupabaseEnv;

  if (hasSupabaseEnv) {
    const client = await createClient();
    const { data, error } = await client.from("text_posts")
      .select("id,title,summary,published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .order("id")
      .range(offset, offset + pageSize);
    posts = data ?? [];
    unavailable = Boolean(error);
  }

  return (
    <main className={styles.index}>
      <h1 className={styles.heading}>Texts</h1>
      {unavailable ? <p>글을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p> : (
        <>
          {posts.length === 0 && <p>{page === 1 ? "아직 공개된 글이 없습니다." : "이 페이지에 글이 없습니다."}</p>}
          <ul className={styles.list}>
            {posts.slice(0, pageSize).map((post) => (
              <li key={post.id}>
                <Link className={styles.row} href={`/texts/${post.id}`}>
                  {post.published_at && <time dateTime={post.published_at}>{formatTextPostDate(post.published_at)}</time>}
                  <div>
                    <h2>{post.title}</h2>
                    <p>{post.summary}</p>
                  </div>
                  <span aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ul>
          {(page > 1 || posts.length > pageSize) && (
            <nav className={styles.pagination} aria-label="글 목록 페이지">
              {page > 1 && <Link href={page === 2 ? "/texts" : `/texts?page=${page - 1}`}>이전</Link>}
              {posts.length > pageSize && <Link href={`/texts?page=${page + 1}`}>다음</Link>}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
