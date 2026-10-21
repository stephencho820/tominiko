"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "./CartProvider";



export function Header() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accountName, setAccountName] = useState("");
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createClient();
    let active = true;
    const sync = (user: { email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!active) return;
      setSignedIn(Boolean(user));
      const name = user?.user_metadata?.name ?? user?.user_metadata?.full_name;
      setAccountName(typeof name === "string" && name.trim() ? name.trim() : "");
    };
    void supabase.auth.getUser().then(({ data }) => sync(data.user)).catch(() => sync(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => sync(session?.user ?? null));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const pathname = usePathname();
  const openTastingOrder = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/tasting-room/qr") return;
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

  useEffect(() => { setOpen(false); }, [pathname]);

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

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          <Link href="/" className="nav-link transition-colors hover:text-[var(--accent)]">HOME</Link>
          <Link href="/shop" className="nav-link transition-colors hover:text-[var(--accent)]">ONLINE SHOP</Link>
          <Link href="/tasting-room" className="nav-link transition-colors hover:text-[var(--accent)]">TASTING ROOM</Link>
          <Link href="/our-story" className="nav-link transition-colors hover:text-[var(--accent)]">PHILOSOPHY</Link>
        </nav>

        <div className="hidden items-center justify-end gap-5 md:flex">
          <Link href="/account" className="nav-meta transition-colors hover:text-[var(--accent)]">
            {signedIn ? (accountName ? `${accountName}님` : "내 계정 ✓") : "로그인"}
          </Link>
          {pathname.startsWith("/tasting-room/qr") && tastingCount > 0 && <Link href="/tasting-room/qr#order" onClick={openTastingOrder} className="nav-meta" aria-label={`Tasting Room 주문 ${tastingCount}개`}>MENU ORDER · {tastingCount}</Link>}
          <Link href="/cart" className="nav-meta flex items-center gap-2 transition-colors hover:text-[var(--accent)]">
            <span>장바구니</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[9px] font-semibold text-[var(--paper)]" aria-label={`${itemCount} items in cart`}>
              {itemCount}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <Link href={signedIn ? "/account" : "/login"} onClick={() => setOpen(false)} className="relative grid h-11 w-11 place-items-center rounded" aria-label={signedIn ? "로그인 상태 · 내 계정" : "로그인"} title={signedIn ? "로그인됨" : "로그인"}>
            <UserRound size={20} aria-hidden="true" />
            {signedIn && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />}
          </Link>
          {pathname.startsWith("/tasting-room/qr") && tastingCount > 0 && <Link href="/tasting-room/qr#order" onClick={openTastingOrder} className="nav-meta text-[10px]" aria-label={`Tasting Room 주문 ${tastingCount}개`}>ORDER {tastingCount}</Link>}
          <Link
            href="/cart"
            className="relative grid h-11 w-11 place-items-center rounded"
            aria-label={`장바구니, ${itemCount}개 상품`}
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
          <Link href="/" className="nav-link" onClick={() => setOpen(false)}>HOME</Link>
          <Link href="/shop" className="nav-link" onClick={() => setOpen(false)}>ONLINE SHOP</Link>
          <Link href="/tasting-room" className="nav-link" onClick={() => setOpen(false)}>TASTING ROOM</Link>
          <Link href="/our-story" className="nav-link" onClick={() => setOpen(false)}>PHILOSOPHY</Link>
          <div className="border-t border-[var(--line)] pt-4">
            <Link href="/account" className="nav-meta" onClick={() => setOpen(false)}>
              {signedIn ? (accountName ? `${accountName}님 · 내 계정 ✓` : "로그인됨 · 내 계정 ✓") : "로그인 / 회원가입"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
