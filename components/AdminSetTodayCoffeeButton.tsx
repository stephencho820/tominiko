"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSetTodayCoffeeButton({ id, current = false }: { id: string; current?: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function select() {
    if (current || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, todays_roast: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "변경하지 못했습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return <span className="admin-today-action">
    <button type="button" onClick={select} disabled={current || saving} aria-pressed={current}>
      {current ? "오늘의 커피" : saving ? "변경 중…" : "오늘의 커피로 설정"}
    </button>
    {error && <small role="alert">{error}</small>}
  </span>;
}
