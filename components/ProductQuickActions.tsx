"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; name: string; stock: number; active: boolean; todaysRoast: boolean; compact?: boolean };

export function ProductQuickActions({ id, name, stock, active, todaysRoast, compact }: Props) {
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
      <div className="admin-stock-control"><span>Stock: {stock}</span><Link href={`/admin/products/${id}`}>Manage size inventory</Link></div>
      <div className="admin-quick-buttons">
        <button type="button" aria-pressed={active} disabled={saving !== ""} onClick={() => void update({ status: active ? "hidden" : "active" }, "active")}>{active ? "Active" : "Inactive"}</button>
        <button type="button" aria-pressed={todaysRoast} disabled={saving !== "" || todaysRoast || !active || stock < 1} onClick={() => void update({ todays_roast: true }, "roast")}>{todaysRoast ? "Today’s roast" : "Make today’s roast"}</button>
      </div>
      <span className="admin-save-feedback" aria-live="polite">{saving ? "Saving…" : message}</span>
    </div>
  );
}
