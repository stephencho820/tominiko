"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nextOrderStatus, orderStatusLabel, orderStatusesForMethod } from "@/lib/admin";

import type { DeliveryMethod } from "@/types";

export function OrderStatusSelect({ id, initial, deliveryMethod, paymentStatus, mode = "quick" }: { id: string; initial: string; deliveryMethod: DeliveryMethod; paymentStatus: string; mode?: "quick" | "select" }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const next = nextOrderStatus({ order_status: status, delivery_method: deliveryMethod });
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
        {orderStatusesForMethod(deliveryMethod).map((item) => <option disabled={paymentStatus !== "paid" && !["new", "confirmed", "cancelled"].includes(item)} value={item} key={item}>{orderStatusLabel(item, deliveryMethod)}</option>)}
      </select>
      {error && <p role="alert">{error}</p>}
    </div>
  );

  return (
    <div className="admin-order-action">
      {next && <button type="button" disabled={isSaving || Boolean(paymentBlocked)} title={paymentBlocked ? "Payment must be completed first" : undefined} onClick={() => void update(next)}>{isSaving ? "Saving…" : `Mark ${orderStatusLabel(next, deliveryMethod)}`}</button>}
      {paymentBlocked && <p>Payment required before fulfillment</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
