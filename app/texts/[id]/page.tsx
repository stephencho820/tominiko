import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { formatTextPostDate, isTextPostId } from "@/lib/text-posts";
import styles from "../texts.module.css";

const getPublishedPost = cache(async (id: string) => {
  if (!hasSupabaseEnv || !isTextPostId(id)) notFound();
  const client = await createClient();
  const { data, error } = await client.from("text_posts")
    .select("title,summary,body,published_at")
    .eq("id", id)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw new Error("Unable to load published text");
  if (!data) notFound();
  return data;
});

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const post = await getPublishedPost((await params).id);
  return { title: post.title, description: post.summary };
}

export default async function TextPage({ params }: Props) {
  const post = await getPublishedPost((await params).id);
  return (
    <main className={styles.reading}>
      <Link className={styles.back} href="/texts">← 글 목록</Link>
      <article>
        <header>
          {post.published_at && <time dateTime={post.published_at}>{formatTextPostDate(post.published_at)}</time>}
          <h1>{post.title}</h1>
        </header>
        <div className={styles.body}>{post.body}</div>
      </article>
    </main>
  );
}
