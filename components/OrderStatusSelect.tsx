"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nextOrderStatus, orderStatusLabels } from "@/lib/admin";

const statuses = ["new", "confirmed", "roasting", "preparing", "ready_for_pickup", "shipped", "completed", "cancelled"];

export function OrderStatusSelect({ id, initial, fulfillmentType, paymentStatus, mode = "quick" }: { id: string; initial: string; fulfillmentType: "delivery" | "pickup"; paymentStatus: string; mode?: "quick" | "select" }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const next = nextOrderStatus({ order_status: status, fulfillment_type: fulfillmentType });
  const paymentBlocked = paymentStatus !== "paid" && next && !["confirmed", "cancelled"].includes(next);

  const update = async (value: string) => {
    const previous = status; setStatus(value); setError(""); setIsSaving(true);
    const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, order_status: value }) });
    if (!response.ok) { setStatus(previous); setError((await response.json()).error ?? "Update failed"); }
    else router.refresh();
    setIsSaving(false);
  };

  if (mode === "select") return (
    <div className="admin-status-control">
      <select value={status} disabled={isSaving} onChange={(event) => void update(event.target.value)} aria-label="Order status">
        {statuses.filter((item) => fulfillmentType === "pickup" ? item !== "shipped" : item !== "ready_for_pickup").map((item) => <option value={item} key={item}>{orderStatusLabels[item]}</option>)}
      </select>
      {error && <p role="alert">{error}</p>}
    </div>
  );

  return (
    <div className="admin-order-action">
      {next && <button type="button" disabled={isSaving || Boolean(paymentBlocked)} title={paymentBlocked ? "Payment must be completed first" : undefined} onClick={() => void update(next)}>{isSaving ? "Saving…" : `Mark ${orderStatusLabels[next]}`}</button>}
      {paymentBlocked && <p>Payment required before fulfillment</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
