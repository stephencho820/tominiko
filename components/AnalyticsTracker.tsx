"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
export function AnalyticsTracker() {
 const path = usePathname();
 useEffect(() => {
   if (path.startsWith("/admin") || path.startsWith("/account") || path.startsWith("/login")) return;
   trackEvent("page_view");
   if (/^\/shop\/[^/]+$/.test(path)) trackEvent("product_view");
   if (path === "/checkout") trackEvent("checkout_start");
 }, [path]);
 return null;
}
