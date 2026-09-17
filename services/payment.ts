export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";
export async function createPaymentIntent(orderId: string, amount: number) {
  return { orderId, amount, status: "pending" as PaymentStatus, provider: "toss-payments" };
}