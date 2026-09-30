"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "./CartProvider";

const primaryLinks = [
  ["SHOP", "/shop"],
  ["PHILOSOPHY", "/our-story"],
  ["TASTING ROOM", "/tasting-room"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount: itemCount } = useCart();

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
          <Link href="/cart" className="nav-meta flex items-center gap-2 transition-colors hover:text-[var(--accent)]">
            <span>Cart</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[9px] font-semibold text-[var(--paper)]" aria-label={`${itemCount} items in cart`}>
              {itemCount}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
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

      {open && (
        <nav className="absolute left-0 top-full flex w-full flex-col gap-5 border-b border-[var(--line)] bg-[var(--ivory)] px-6 py-6 shadow-lg md:hidden">
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
