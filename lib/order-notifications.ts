import { createServiceClient } from "@/lib/supabase/service";

/**
 * Best-effort admin notification. Requires RESEND_API_KEY and ORDER_NOTIFICATION_FROM.
 * Never blocks checkout, and never sends customer personal data to the browser.
 */
export async function notifyAdminsOfNewOrder(order: {
  id: string; number: string; name: string; amount: number; method: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_NOTIFICATION_FROM;
  if (!apiKey || !from) {
    console.warn("Order email notification is not configured (RESEND_API_KEY / ORDER_NOTIFICATION_FROM).");
    return;
  }
  try {
    const supabase = createServiceClient();
    const { data: admins, error } = await supabase.from("profiles").select("id").eq("role", "admin");
    if (error) throw error;
    const emailResults = await Promise.all((admins ?? []).map(async (admin) => {
      const { data } = await supabase.auth.admin.getUserById(admin.id);
      return data.user?.email?.trim().toLowerCase();
    }));
    const recipients = [...new Set(emailResults.filter((email): email is string => Boolean(email)))];
    if (!recipients.length) return;
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\\/$/, "") || "https://tominiko-tominiko.vercel.app";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: recipients,
        subject: `[CASA] 새 주문 접수 · ${order.number}`,
        text: [
          "CASA DI STEFANO에 새 주문이 접수되었습니다.",
          `주문번호: ${order.number}`,
          `주문자: ${order.name}`,
          `주문금액: ₩${order.amount.toLocaleString("ko-KR")}`,
          `수령방법: ${order.method}`,
          "결제상태: 입금 대기 (결제 완료 아님)",
          `관리자 주문 확인: ${site}/admin/orders`,
        ].join("\\n"),
      }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  } catch (error) {
    console.error("Failed to send new order email notification:", error);
  }
}
