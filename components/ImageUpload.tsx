"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { optimizeProductImage } from "@/lib/product-image";

export function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const busyRef = useRef(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const busy = stage === "Optimizing…" || stage === "Uploading…";
  async function upload(file: File) {
    if (busyRef.current) return;
    busyRef.current = true; setError(""); setStage("Optimizing…");
    try {
      const optimized = await optimizeProductImage(file);
      setStage("Uploading…");
      const supabase = createClient();
      const { error } = await supabase.storage.from("product-images").upload(optimized.name, optimized, { contentType: optimized.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(optimized.name);
      onUploaded(data.publicUrl); setStage("Uploaded");
    } catch (error) {
      setStage(""); setError(error instanceof Error || (error && typeof error === "object" && "message" in error) ? String(error.message) : "이미지 업로드에 실패했습니다.");
    } finally { busyRef.current = false; }
  }
  return <label className="eyebrow md:col-span-2">Product image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} className="mt-2 block w-full border border-[#bdb3a5] p-3 text-sm normal-case tracking-normal" />{stage && <span role="status" className="mt-2 block normal-case tracking-normal">{stage}</span>}{error && <span role="alert" className="mt-2 block normal-case tracking-normal">{error}</span>}</label>;
}
