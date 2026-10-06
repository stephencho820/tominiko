"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ProductDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const deletingRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (deletingRef.current || !window.confirm(`“${name}” 상품을 정말 삭제하시겠습니까?`)) return;
    deletingRef.current = true;
    setDeleting(true); setError("");
    try {
      const response = await fetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "상품을 삭제하지 못했습니다."); return; }
      router.refresh();
    } catch { setError("상품을 삭제하지 못했습니다. 네트워크 연결을 확인해 주세요."); }
    finally { deletingRef.current = false; setDeleting(false); }
  }
  return <div><button type="button" className="eyebrow underline" disabled={deleting} onClick={() => void remove()}>{deleting ? "Deleting…" : "Delete"}</button>{error && <p role="alert" className="admin-form-error">{error}</p>}</div>;
}
