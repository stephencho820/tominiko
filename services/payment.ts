import "server-only";

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

const TOSS_API_URL = "https://api.tosspayments.com/v1";

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method?: string | null;
  approvedAt?: string | null;
  cancels?: Array<{ cancelAmount: number; cancelReason: string }> | null;
};

function authorization() {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) throw new Error("Toss Payments is not configured");
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function tossRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${TOSS_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: authorization(),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data.message === "string" ? data.message : "Payment provider request failed");
    Object.assign(error, { code: data.code, status: response.status });
    throw error;
  }
  return data as TossPayment;
}

export function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  return tossRequest("/payments/confirm", {
    method: "POST",
    headers: { "Idempotency-Key": `confirm-${paymentKey}` },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
}

export function getPayment(paymentKey: string) {
  return tossRequest(`/payments/${encodeURIComponent(paymentKey)}`);
}

export function cancelPayment(paymentKey: string, cancelReason: string) {
  return tossRequest(`/payments/${encodeURIComponent(paymentKey)}/cancel`, {
    method: "POST",
    headers: { "Idempotency-Key": `cancel-${paymentKey}` },
    body: JSON.stringify({ cancelReason }),
  });
}

export function isConfirmedPayment(payment: TossPayment, orderId: string, amount: number) {
  return payment.orderId === orderId && payment.totalAmount === amount && payment.status === "DONE";
}
