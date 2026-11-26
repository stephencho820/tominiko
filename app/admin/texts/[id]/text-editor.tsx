"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import type { TextPost } from "@/lib/text-posts";
import { ImageUpload } from "@/components/ImageUpload";
import { TextPostBody } from "@/components/TextPostBody";
import { saveText } from "./actions";

export function TextEditor({ post }: { post: TextPost | null }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [visibility, setVisibility] = useState(post?.published_at ? "published" : "draft");
  const [error, action, pending] = useActionState(saveText.bind(null, post?.id ?? null, post?.updated_at ?? null), "");
  const inputClass = "block w-full rounded-sm border border-stone-400 bg-white p-3 font-normal";

  function insertPhoto(url: string) {
    const field = textarea.current;
    if (!field) return;
    const position = field.selectionEnd;
    const marker = `\n\n![](${url})\n\n`;
    const next = field.value.slice(0, position) + marker + field.value.slice(position);
    if (next.length > field.maxLength) {
      setPhotoError("본문이 너무 깁니다. 일부 내용을 줄인 뒤 사진을 다시 추가해 주세요.");
      return;
    }
    setPhotoError("");
    setBody(next);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(position + marker.length, position + marker.length);
    });
  }

  return (
    <form onSubmit={(event) => { if (uploading) event.preventDefault(); }} action={action} className="admin-panel mt-5 max-w-3xl">
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
          <textarea ref={textarea} name="body" className={inputClass} required rows={14} maxLength={50000} value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        <div className="grid gap-2">
          <ImageUpload
            label="본문에 사진 추가"
            bucket="page-images"
            successMessage="업로드 완료 · 발행 화면에서 사진 위치를 확인하세요."
            onUploaded={insertPhoto}
            onUploadingChange={setUploading}
          />
          <p className="admin-muted">본문에서 사진을 넣을 위치를 누른 뒤 파일을 선택하세요. JPG, PNG, WebP · 최대 10MB</p>
          {photoError && <p className="text-red-800" role="alert">{photoError}</p>}
          {body && <details className="rounded-sm border border-stone-400 p-3">
            <summary className="cursor-pointer">발행 화면 미리보기</summary>
            <div className="mt-3"><TextPostBody body={body} /></div>
          </details>}
        </div>
        <label className="grid max-w-xs gap-2 font-semibold">
          공개 상태
          <select name="visibility" className={inputClass} value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="draft">{post?.published_at ? "비공개" : "임시 저장"}</option>
            <option value="published">공개</option>
          </select>
        </label>
        {error && <p className="text-red-800" role="alert">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button className="admin-primary-button" type="submit" disabled={uploading}>{pending ? "저장 중…" : uploading ? "사진 업로드 중…" : "저장"}</button>
          {post?.published_at && <Link className="admin-text-link" href={`/texts/${post.id}`}>공개된 글 보기</Link>}
        </div>
      </fieldset>
    </form>
  );
}
