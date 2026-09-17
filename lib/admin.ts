import type { Order, Product } from "@/types";

export const LOW_STOCK_THRESHOLD = 5;

export const orderStatusLabels: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  roasting: "Roasting",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const paymentStatusLabels: Record<string, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
  refunded: "Refunded",
};

export function stockState(product: Pick<Product, "stock_quantity">) {
  if (product.stock_quantity <= 0) return { label: "Sold out", tone: "danger" };
  if (product.stock_quantity <= LOW_STOCK_THRESHOLD) return { label: "Low stock", tone: "warning" };
  return { label: "In stock", tone: "success" };
}

export function nextOrderStatus(order: Pick<Order, "order_status" | "fulfillment_type">) {
  if (["completed", "cancelled"].includes(order.order_status)) return null;
  if (order.fulfillment_type === "pickup") {
    const flow = ["new", "confirmed", "roasting", "preparing", "ready_for_pickup", "completed"];
    return flow[flow.indexOf(order.order_status) + 1] ?? null;
  }
  const flow = ["new", "confirmed", "roasting", "preparing", "shipped", "completed"];
  return flow[flow.indexOf(order.order_status) + 1] ?? null;
}

export function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export function seoulTodayRange() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const start = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00+09:00`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}
