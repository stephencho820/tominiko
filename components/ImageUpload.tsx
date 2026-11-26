"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { optimizeProductImage } from "@/lib/product-image";

export function ImageUpload({ onUploaded, label = "상품 사진 업로드", bucket = "product-images", successMessage = "업로드 완료 · 상품 저장 버튼을 눌러 반영하세요.", onUploadingChange, multiple = false, maxFiles = 8 }: {
  onUploaded: (url: string) => void;
  label?: string;
  bucket?: "product-images" | "page-images";
  successMessage?: string;
  onUploadingChange?: (uploading: boolean) => void;
  multiple?: boolean;
  maxFiles?: number;
}) {
  const busyRef = useRef(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const busy = stage.startsWith("이미지 최적화 중…") || stage.startsWith("사진 업로드 중…");
  async function upload(files: File[]) {
    if (busyRef.current) return;
    if (files.length === 0) return;
    if (files.length > maxFiles) {
      setError(`사진은 한 번에 최대 ${maxFiles}장까지 선택할 수 있습니다.`);
      return;
    }
    busyRef.current = true; onUploadingChange?.(true); setError(""); setStage("이미지 최적화 중…");
    try {
      const supabase = createClient();
      for (let index = 0; index < files.length; index += 1) {
        const count = files.length > 1 ? ` (${index + 1}/${files.length})` : "";
        setStage(`이미지 최적화 중…${count}`);
        const optimized = await optimizeProductImage(files[index]);
        setStage(`사진 업로드 중…${count}`);
        const { error } = await supabase.storage.from(bucket).upload(optimized.name, optimized, { contentType: optimized.type });
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(optimized.name);
        onUploaded(data.publicUrl);
      }
      setStage(files.length > 1 ? `${files.length}장 업로드 완료 · 발행 화면에서 사진 위치를 확인하세요.` : successMessage);
    } catch (error) {
      setStage(""); setError(error instanceof Error || (error && typeof error === "object" && "message" in error) ? String(error.message) : "이미지 업로드에 실패했습니다.");
    } finally { busyRef.current = false; onUploadingChange?.(false); }
  }
  return <label className="admin-photo-upload">{label}<input type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} disabled={busy} onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) void upload(files); }} className="mt-2 block w-full border border-[#bdb3a5] p-3 text-sm normal-case tracking-normal" />{stage && <span role="status" className="mt-2 block normal-case tracking-normal">{stage}</span>}{error && <span role="alert" className="mt-2 block normal-case tracking-normal">{error}</span>}</label>;
}
