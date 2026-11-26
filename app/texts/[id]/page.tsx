import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { formatTextPostDate, isTextPostId } from "@/lib/text-posts";
import { getFirstPostImage, TextPostBody } from "@/components/TextPostBody";
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
  const cover = getFirstPostImage(post.body);
  return (
    <main className={styles.reading}>
      <section className={`${styles.hero} ${cover ? "" : styles.heroFallback}`} style={cover ? { backgroundImage: `linear-gradient(rgba(16,18,16,.18),rgba(16,18,16,.42)),url(${cover.url})` } : undefined}>
        <div className={styles.heroText}>
          <Link href="/texts">Texts</Link>
          <h1>{post.title}</h1>
        </div>
      </section>
      <div className={styles.articleShell}>
        <article>
          <header className={styles.articleMeta}>
            <Link className={styles.back} href="/texts">← Texts</Link>
            {post.published_at && <time dateTime={post.published_at}>{formatTextPostDate(post.published_at)}</time>}
          </header>
          <div className={styles.body}><TextPostBody body={post.body} skipFirstImage={Boolean(cover)} /></div>
        </article>
      </div>
    </main>
  );
}
