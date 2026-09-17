import { orderStatusLabels, paymentStatusLabels } from "@/lib/admin";

export function StatusBadge({ type, value }: { type: "order" | "payment" | "stock"; value: string }) {
  const label = type === "payment" ? paymentStatusLabels[value] ?? value : type === "order" ? orderStatusLabels[value] ?? value : value;
  const tone = type === "stock"
    ? value === "Sold out" ? "danger" : value === "Low stock" ? "warning" : "success"
    : type === "payment"
    ? value === "paid" ? "success" : value === "pending" ? "warning" : "danger"
    : value === "cancelled" ? "danger" : value === "completed" ? "success" : "neutral";
  return <span className={`admin-badge admin-badge-${tone}`}>{label}</span>;
}
