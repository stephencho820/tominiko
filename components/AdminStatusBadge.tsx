import { orderStatusLabel, paymentStatusLabels } from "@/lib/admin";

import type { DeliveryMethod } from "@/types";

export function StatusBadge({ type, value, deliveryMethod }: { type: "order" | "payment" | "stock"; value: string; deliveryMethod?: DeliveryMethod }) {
  const label = type === "payment" ? paymentStatusLabels[value] ?? value : type === "order" ? orderStatusLabel(value, deliveryMethod) : value;
  const tone = type === "stock"
    ? value === "Sold out" ? "danger" : value === "Low stock" ? "warning" : "success"
    : type === "payment"
    ? value === "paid" ? "success" : value === "pending" ? "warning" : "danger"
    : value === "cancelled" ? "danger" : value === "completed" ? "success" : "neutral";
  return <span className={`admin-badge admin-badge-${tone}`}>{label}</span>;
}
