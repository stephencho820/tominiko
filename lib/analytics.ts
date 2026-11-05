export type AnalyticsEvent = "page_view"|"product_view"|"add_to_cart"|"checkout_start"|"order_placed";
export function trackEvent(event: AnalyticsEvent, productId?: string) {
  if (typeof window === "undefined") return;
  try {
    let sessionId = sessionStorage.getItem("casa-analytics-session");
    if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem("casa-analytics-session", sessionId); }
    const params = new URLSearchParams(location.search);
    const source = params.get("utm_source") || (document.referrer ? new URL(document.referrer).hostname : "direct");
    void fetch("/api/analytics/event", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, event, path: location.pathname, source, device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop", productId }),
      keepalive: true, credentials: "same-origin",
    }).catch(() => {});
  } catch {}
}
