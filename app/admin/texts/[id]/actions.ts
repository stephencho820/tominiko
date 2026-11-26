"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { isTextPostId } from "@/lib/text-posts";

export async function saveText(
  id: string | null,
  version: string | null,
  _previous: string,
  form: FormData,
): Promise<string> {
  const client = await getAdminClient();
  if (!client) return "관리자로 다시 로그인한 뒤 저장해 주세요.";
  if (id && !isTextPostId(id)) return "글 주소가 올바르지 않습니다.";

  const title = String(form.get("title") ?? "").trim();
  const summary = String(form.get("summary") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const publish = form.get("visibility");
  if (!title || title.length > 150 || !summary || summary.length > 240 || !body || body.length > 50000) {
    return "제목, 미리보기, 본문을 입력하고 글자 수 제한을 확인해 주세요.";
  }
  if (publish !== "draft" && publish !== "published") return "공개 상태를 확인해 주세요.";

  const now = new Date().toISOString();
  let publishedAt = null;
  if (id) {
    const { data, error } = await client.from("text_posts")
      .select("published_at,updated_at").eq("id", id).maybeSingle();
    if (error) return "글을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    if (!data || data.updated_at !== version) return "다른 곳에서 글이 변경되었습니다. 입력한 내용을 복사한 뒤 글을 다시 열어 주세요.";
    publishedAt = data.published_at;
  }

  const values = {
    title, summary, body,
    published_at: publish === "published" ? (publishedAt ?? now) : null,
    updated_at: now,
  };
  const query = id
    ? client.from("text_posts").update(values).eq("id", id).eq("updated_at", version!)
    : client.from("text_posts").insert(values);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  if (!data) return "다른 곳에서 글이 변경되었습니다. 입력한 내용을 복사한 뒤 글을 다시 열어 주세요.";

  revalidatePath("/admin/texts");
  revalidatePath("/texts");
  revalidatePath(`/texts/${data.id}`);
  redirect("/admin/texts");
}
