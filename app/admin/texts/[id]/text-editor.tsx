"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { TextPost } from "@/lib/text-posts";
import { saveText } from "./actions";

export function TextEditor({ post }: { post: TextPost | null }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [visibility, setVisibility] = useState(post?.published_at ? "published" : "draft");
  const [error, action, pending] = useActionState(saveText.bind(null, post?.id ?? null, post?.updated_at ?? null), "");
  const inputClass = "block w-full rounded-sm border border-stone-400 bg-white p-3 font-normal";

  return (
    <form action={action} className="admin-panel mt-5 max-w-3xl">
      <fieldset disabled={pending} className="grid gap-5">
        <label className="grid gap-2 font-semibold">
          제목
          <input name="title" className={inputClass} required maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="grid gap-2 font-semibold">
          목록 미리보기
          <textarea name="summary" className={inputClass} required rows={2} maxLength={240} value={summary} onChange={(event) => setSummary(event.target.value)} />
        </label>
        <label className="grid gap-2 font-semibold">
          본문
          <textarea name="body" className={inputClass} required rows={14} maxLength={50000} value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <label className="grid max-w-xs gap-2 font-semibold">
          공개 상태
          <select name="visibility" className={inputClass} value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="draft">{post?.published_at ? "비공개" : "임시 저장"}</option>
            <option value="published">공개</option>
          </select>
        </label>
        {error && <p className="text-red-800" role="alert">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button className="admin-primary-button" type="submit">{pending ? "저장 중…" : "저장"}</button>
          {post?.published_at && <Link className="admin-text-link" href={`/texts/${post.id}`}>공개된 글 보기</Link>}
        </div>
      </fieldset>
    </form>
  );
}
