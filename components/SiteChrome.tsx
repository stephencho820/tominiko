"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/site";
import { Header } from "@/components/Header";

export function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Admin has a standalone workspace, with no storefront header, footer or site-shell.
    return <>{children}</>;
  }
  const kiosk = pathname === "/tasting-room/qr" || pathname.startsWith("/tasting-room/order/");
  if (kiosk) {
    return <div className="min-h-screen bg-[var(--ivory)]">
      <div className="border-b border-[var(--line)] px-5 py-5 text-center">
        <p className="text-[13px] font-bold tracking-[.18em] text-[var(--ink)]">CASA DI STEFANO</p>
        <p className="mt-2 text-[10px] tracking-[.2em] text-[var(--muted)]">TASTING ROOM · SELF PICK-UP</p>
      </div>
      <div className="site-shell">{children}</div>
    </div>;
  }
  const showChat = pathname === "/" || pathname === "/shop" || pathname.startsWith("/shop/");
  const chat = showChat && (
    <a
      href={BUSINESS_INFO.contactUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[90] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-[#0c221a] px-4 text-xs font-semibold text-[#faf4e8] shadow-lg hover:bg-[#204637] focus-visible:outline-white"
    >
      <MessageCircle size={17} aria-hidden="true" />
      카카오톡 문의
    </a>
  );
  if (pathname === "/") {
    return <div className="home-chrome"><Header />{children}{chat}</div>;
  }
  return <><Header /><div className="site-shell">{children}</div>{footer}{chat}</>;
}
