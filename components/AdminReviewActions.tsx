"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminReviewActions({ id, status, reviewer }: { id: string; status: "published" | "hidden"; reviewer?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const run = async (method: "PATCH" | "DELETE") => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/reviews", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(method === "PATCH" ? { id, status: status === "published" ? "hidden" : "published" } : { id }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "리뷰 작업에 실패했습니다."); return; }
      router.refresh();
    } catch { setError("네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <div className="admin-review-actions"><button type="button" disabled={busy} onClick={() => void run("PATCH")}>{status === "published" ? "숨김" : "다시 공개"}</button><button type="button" disabled={busy} onClick={() => { if (!busyRef.current && confirm(reviewer ? `“${reviewer}”님의 리뷰를 영구 삭제하시겠습니까?` : "리뷰를 영구 삭제하시겠습니까?")) void run("DELETE"); }}>삭제</button>{error && <p role="alert">{error}</p>}</div>;
}

export function GuestReviewSetting({ initial }: { initial: boolean }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const busyRef = useRef(false);
  async function save(next: boolean) {
    if (busyRef.current) return;
    const previous = value;
    busyRef.current = true; setValue(next); setBusy(true); setFeedback(null);
    try {
      const response = await fetch("/api/admin/reviews/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allow_guest_reviews: next }) });
      const result = await response.json();
      if (!response.ok) { setValue(previous); setFeedback({ error: true, message: result.error ?? "리뷰 설정을 저장하지 못했습니다." }); return; }
      setFeedback({ error: false, message: "저장되었습니다." });
    } catch { setValue(previous); setFeedback({ error: true, message: "네트워크 오류가 발생했습니다. 다시 시도해 주세요." }); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <div><label className="admin-review-setting"><span><strong>비로그인 리뷰</strong><small>{value ? "닉네임을 입력하면 작성 가능" : "로그인 사용자만 작성 가능"}</small></span><input type="checkbox" checked={value} disabled={busy} onChange={e => void save(e.target.checked)} /></label>{feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}</div>;
}
