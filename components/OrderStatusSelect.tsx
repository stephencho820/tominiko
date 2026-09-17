"use client";

import { useState } from "react";

const statuses = ["new", "confirmed", "roasting", "preparing", "ready_for_pickup", "shipped", "completed", "cancelled"];

export function OrderStatusSelect({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const update = async (value: string) => {
    const previous = status;
    setStatus(value);
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, order_status: value }),
      });
      if (!response.ok) throw new Error("Could not update status");
    } catch {
      setStatus(previous);
      setError("Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <select
        value={status}
        disabled={isSaving}
        onChange={(event) => void update(event.target.value)}
        className="border border-[#bdb3a5] bg-transparent p-2 text-xs uppercase disabled:opacity-60"
        aria-label="Order status"
      >
        {statuses.map((item) => <option key={item}>{item}</option>)}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-red-800">{error}</p>}
    </div>
  );
}
