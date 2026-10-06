"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; name: string; status?: string; todaysRoast: boolean; compact?: boolean };

export function ProductQuickActions({ id, name, status = "active", todaysRoast, compact }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  async function update(payload: Record<string, unknown>, action: string) {
    setSaving(action); setMessage("");
    const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...payload }) });
    setSaving("");
    if (!response.ok) { setMessage("저장하지 못했습니다."); return; }
    setMessage(action === "roast" ? `${name} selected` : "Saved");
    router.refresh();
  }

  return (
    <div className={`admin-quick ${compact ? "admin-quick-compact" : ""}`}>
      <div className="admin-quick-buttons">
        <button type="button" aria-pressed={status === "active" || status === "sold-out"} disabled={saving !== ""} onClick={() => void update({ status: status === "active" || status === "sold-out" ? "hidden" : "active" }, "status")}>{status === "active" || status === "sold-out" ? "Visible" : "Hidden"}</button>
        <button type="button" aria-pressed={todaysRoast} disabled={saving !== "" || todaysRoast || status !== "active"} onClick={() => void update({ todays_roast: true }, "roast")}>{todaysRoast ? "Today’s roast" : "Make today’s roast"}</button>
      </div>
      <a className="admin-text-link" href={`/admin/products/${id}`}>Edit variant stock →</a>
      <span className="admin-save-feedback" aria-live="polite">{saving ? "Saving…" : message}</span>
    </div>
  );
}
