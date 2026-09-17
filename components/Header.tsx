"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

const primaryLinks = [
  ["SHOP", "/shop"],
  ["ZERO DEGREES", "/zero-degrees"],
  ["TASTING ROOM", "/tasting-room"],
  ["OUR STORY", "/our-story"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { items } = useCart();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

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
    <header className={`relative z-20 border-b border-[var(--line)] bg-[var(--ivory)] px-5 md:px-10 ${scrolled ? "is-scrolled" : ""}`}>
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6">
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

        <div className="hidden items-center gap-5 md:flex">
          <Link href="/account" className="nav-meta transition-colors hover:text-[var(--accent)]">
            Account
          </Link>
          <Link href="/cart" className="nav-meta flex items-center gap-2 transition-colors hover:text-[var(--accent)]">
            <span>Cart</span>
            {itemCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[9px] font-semibold text-[var(--paper)]">
                {itemCount}
              </span>
            )}
          </Link>
          <LanguageSwitcher />
        </div>

        <button
          className="rounded p-2 md:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
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
          <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
            <Link href="/account" className="nav-meta" onClick={() => setOpen(false)}>
              Account
            </Link>
            <Link href="/cart" className="nav-meta" onClick={() => setOpen(false)}>
              Cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
          </div>
          <LanguageSwitcher />
        </nav>
      )}
    </header>
  );
}
