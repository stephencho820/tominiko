import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { isTextPostId, type TextPost } from "@/lib/text-posts";
import { TextEditor } from "./text-editor";

export default async function EditTextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "new" && !isTextPostId(id)) notFound();
  const client = await getAdminClient();
  if (!client) redirect(`/login?next=${encodeURIComponent(`/admin/texts/${id}`)}`);

  let post: TextPost | null = null;
  if (id !== "new") {
    const { data, error } = await client.from("text_posts")
      .select("id,title,summary,body,published_at,updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Unable to load text for editing");
    if (!data) notFound();
    post = data;
  }

  return (
    <section>
      <Link className="admin-back" href="/admin/texts">← 글 관리</Link>
      <div className="admin-page-heading"><h1>{post ? "글 수정" : "새 글 쓰기"}</h1></div>
      <TextEditor key={id} post={post} />
    </section>
  );
}
