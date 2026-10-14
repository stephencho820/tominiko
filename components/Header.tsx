"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "./CartProvider";

const primaryLinks = [
  ["SHOP", "/shop"],
  ["PHILOSOPHY", "/our-story"],
  ["TASTING ROOM", "/tasting-room"],
  ["MENU", "/tasting-room/menu"],
  ["MY ORDERS", "/tasting-room/order/history"],
  ["SUBSCRIPTION", "/subscription"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const openTastingOrder = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/tasting-room/menu") return;
    event.preventDefault();
    window.dispatchEvent(new Event("tasting-open-order"));
    setOpen(false);
  };
  const [scrolled, setScrolled] = useState(false);
  const { cartCount: itemCount, cartSubtotal, cartNotice, dismissCartNotice } = useCart();
  const freeShippingThreshold = 50000;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - cartSubtotal);
  const [tastingCount, setTastingCount] = useState(0);
  useEffect(() => {
    try { const saved=localStorage.getItem("casa-tasting-cart-v1"); if(saved){const lines=JSON.parse(saved); if(Array.isArray(lines)) setTastingCount(lines.reduce((sum:number,line:{quantity?:number})=>sum+(Number(line.quantity)||0),0));} } catch {}
    const update = (event: Event) => setTastingCount((event as CustomEvent<number>).detail || 0);
    window.addEventListener("tasting-cart-count", update);
    return () => window.removeEventListener("tasting-cart-count", update);
  }, []);
  useEffect(() => { if (!cartNotice) return; const id = window.setTimeout(dismissCartNotice, 2200); return () => window.clearTimeout(id); }, [cartNotice, dismissCartNotice]);

  useEffect(() => {
    const story = document.querySelector<HTMLElement>(".home-story");
    const updateScrolled = () => setScrolled(window.scrollY > 8 || (story?.scrollTop ?? 0) > 8);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    story?.addEventListener("scroll", updateScrolled, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrolled);
      story?.removeEventListener("scroll", updateScrolled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header className={`site-header relative z-20 border-b border-[var(--line)] bg-[var(--ivory)] px-5 md:px-8 ${scrolled ? "is-scrolled" : ""}`}>
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-6 md:grid md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="group flex items-center" onClick={() => setOpen(false)}>
          <span className="text-[13px] font-bold tracking-[.18em] text-[var(--ink)] md:text-[14px]">
            CASA DI STEFANO
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {primaryLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="nav-link transition-colors hover:text-[var(--accent)]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-5 md:flex">
          <Link href="/account" className="nav-meta transition-colors hover:text-[var(--accent)]">
            Account
          </Link>
          {tastingCount > 0 && <Link href="/tasting-room/menu#order" onClick={openTastingOrder} className="nav-meta" aria-label={`Tasting Room 주문 ${tastingCount}개`}>MENU ORDER · {tastingCount}</Link>}
          <Link href="/cart" className="nav-meta flex items-center gap-2 transition-colors hover:text-[var(--accent)]">
            <span>Cart</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[9px] font-semibold text-[var(--paper)]" aria-label={`${itemCount} items in cart`}>
              {itemCount}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {tastingCount > 0 && <Link href="/tasting-room/menu#order" onClick={openTastingOrder} className="nav-meta text-[10px]" aria-label={`Tasting Room 주문 ${tastingCount}개`}>ORDER {tastingCount}</Link>}
          <Link
            href="/cart"
            className="relative grid h-11 w-11 place-items-center rounded"
            aria-label={`Cart with ${itemCount} items`}
            onClick={() => setOpen(false)}
          >
            <ShoppingBag size={20} aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[8px] font-semibold leading-none text-[var(--paper)]">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            className="grid h-11 w-11 place-items-center rounded"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {cartNotice && <div className="site-cart-toast" role="status"><span>✓ {cartNotice}<br/><small>{freeShippingRemaining > 0 ? `${freeShippingRemaining.toLocaleString("ko-KR")}원 더 담으면 무료배송` : "무료배송 조건을 달성했어요"}</small></span><Link href="/cart" onClick={dismissCartNotice}>장바구니 보기 →</Link></div>}
      {open && (
        <nav className="mobile-nav-panel absolute left-0 top-full flex w-full flex-col gap-2 border-b border-[var(--line)] bg-[var(--ivory)] px-6 py-5 shadow-lg md:hidden">
          {primaryLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="nav-link"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-[var(--line)] pt-4">
            <Link href="/account" className="nav-meta" onClick={() => setOpen(false)}>
              Account
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
