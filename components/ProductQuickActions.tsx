"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; name: string; stock: number; status: Product["status"]; todaysRoast: boolean; compact?: boolean };

export function ProductQuickActions({ id, name, stock, status, todaysRoast, compact }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  async function update(payload: Record<string, unknown>, action: string) {
    if (saving) return;
    setSaving(action); setMessage("");
    try {
      const response = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...payload }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "저장하지 못했습니다."); return; }
      setMessage(action === "roast" ? `${name} selected` : "Saved");
      router.refresh();
    } catch { setMessage("저장하지 못했습니다. 네트워크 연결을 확인해 주세요."); }
    finally { setSaving(""); }
  }

  return (
    <div className={`admin-quick ${compact ? "admin-quick-compact" : ""}`}>
      <div className="admin-stock-control"><span>Stock: {stock}</span><Link href={`/admin/products/${id}`}>Manage size inventory</Link></div>
      <div className="admin-quick-buttons">
        <button type="button" aria-pressed={status === "active"} disabled={saving !== ""} onClick={() => void update({ status: status === "active" || status === "sold-out" ? "hidden" : "active" }, "active")}>{status === "active" || status === "sold-out" ? "Hide" : "Activate"}</button>
        <button type="button" aria-pressed={todaysRoast} disabled={saving !== "" || todaysRoast || status !== "active" || stock < 1} onClick={() => void update({ todays_roast: true }, "roast")}>{todaysRoast ? "Today’s roast" : "Make today’s roast"}</button>
      </div>
      <span className="admin-save-feedback" aria-live="polite">{saving ? "Saving…" : message}</span>
    </div>
  );
}
