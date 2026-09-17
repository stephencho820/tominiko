"use client";

import { usePathname } from "next/navigation";
import PaymentCheckout from "@/components/PaymentCheckout";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname === "/checkout" ? <PaymentCheckout /> : children;
}
