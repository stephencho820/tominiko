"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";

export function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
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
  return <><Header /><div className="site-shell">{children}</div>{footer}</>;
}
