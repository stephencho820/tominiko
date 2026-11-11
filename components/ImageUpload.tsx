"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { optimizeProductImage } from "@/lib/product-image";

export function ImageUpload({ onUploaded, label = "상품 사진 업로드", onUploadingChange }: {
  onUploaded: (url: string) => void;
  label?: string;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const busyRef = useRef(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const busy = stage === "이미지 최적화 중…" || stage === "사진 업로드 중…";
  async function upload(file: File) {
    if (busyRef.current) return;
    busyRef.current = true; onUploadingChange?.(true); setError(""); setStage("이미지 최적화 중…");
    try {
      const optimized = await optimizeProductImage(file);
      setStage("사진 업로드 중…");
      const supabase = createClient();
      const { error } = await supabase.storage.from("product-images").upload(optimized.name, optimized, { contentType: optimized.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(optimized.name);
      onUploaded(data.publicUrl); setStage("업로드 완료 · 상품 저장 버튼을 눌러 반영하세요.");
    } catch (error) {
      setStage(""); setError(error instanceof Error || (error && typeof error === "object" && "message" in error) ? String(error.message) : "이미지 업로드에 실패했습니다.");
    } finally { busyRef.current = false; onUploadingChange?.(false); }
  }
  return <label className="admin-photo-upload">{label}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} className="mt-2 block w-full border border-[#bdb3a5] p-3 text-sm normal-case tracking-normal" />{stage && <span role="status" className="mt-2 block normal-case tracking-normal">{stage}</span>}{error && <span role="alert" className="mt-2 block normal-case tracking-normal">{error}</span>}</label>;
}
