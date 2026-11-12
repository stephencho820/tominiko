"use client";

import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/site";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight, BarChart3, ChevronDown, ClipboardList, Coffee,
  Crown, Home, LayoutDashboard, Menu, MessageSquareText, Package,
  Repeat2, Settings2, ShoppingBag, Store, Truck, UserRound, Users, X,
} from "lucide-react";

const primary = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/orders", label: "온라인 주문", icon: ShoppingBag },
  { href: "/admin/products", label: "상품 관리", icon: Package },
  { href: "/admin/roasting", label: "로스팅 준비", icon: ClipboardList },
];
const tasting = [
  { href: "/admin/tasting-orders", label: "매장 주문", icon: Coffee },
  { href: "/admin/tasting-menu", label: "매장 메뉴", icon: Store },
];
const secondary = [
  { href: "/admin/customers", label: "구매 고객", icon: Users },
  { href: "/admin/members", label: "회원 관리", icon: UserRound },
  { href: "/admin/vip", label: "등급 관리", icon: Crown },
  { href: "/admin/subscriptions", label: "정기구독", icon: Repeat2 },
  { href: "/admin/reviews", label: "리뷰 관리", icon: MessageSquareText },
  { href: "/admin/pages", label: "홈페이지 콘텐츠", icon: Home },
  { href: "/admin/delivery", label: "배송 설정", icon: Truck },
  { href: "/admin/analytics", label: "방문 분석", icon: BarChart3 },
];
const all = [...primary, ...tasting, ...secondary];

const activeAt = (pathname: string, href: string) =>
  pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));

export function AdminWorkspaceChrome({
  children,
  signOut,
}: {
  children: ReactNode;
  signOut: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(() => secondary.some((item) => activeAt(pathname, item.href)));
  const current = all.find((item) => activeAt(pathname, item.href));
  const currentLabel = current?.label ?? "관리자";

  useEffect(() => {
    setMobileOpen(false);
    if (secondary.some((item) => activeAt(pathname, item.href))) setMoreOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [mobileOpen]);

  function navLink(item: (typeof all)[number]) {
    const Icon = item.icon;
    const active = activeAt(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={"admin-nav-link" + (active ? " is-active" : "")}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="admin-shell admin-console">
      {mobileOpen && (
        <button
          type="button"
          className="admin-nav-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={"admin-sidebar" + (mobileOpen ? " is-open" : "")} aria-label="관리자 메뉴">
        <div className="admin-sidebar-brand">
          <Link href="/admin" aria-label="관리자 대시보드" onClick={() => setMobileOpen(false)}>
            <span className="admin-brand-mark">C</span>
            <span className="admin-brand-name">
              <strong>CASA ADMIN</strong>
              <small>운영 관리 시스템</small>
            </span>
          </Link>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="관리자 메뉴 닫기"
          >
            <X size={22} />
          </button>
        </div>
        <nav className="admin-sidebar-scroll" aria-label="관리자 페이지">
          <p className="admin-nav-caption">주요 업무</p>
          {primary.map(navLink)}
          <p className="admin-nav-caption admin-nav-spaced">테이스팅룸</p>
          {tasting.map(navLink)}
          <button
            type="button"
            className={"admin-nav-more" + (secondary.some((item) => activeAt(pathname, item.href)) ? " is-active" : "")}
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-controls="admin-extra-navigation"
          >
            <Settings2 size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>고객 · 사이트 관리</span>
            <ChevronDown size={16} className={moreOpen ? "is-rotated" : ""} aria-hidden="true" />
          </button>
          {moreOpen && (
            <div id="admin-extra-navigation" className="admin-nav-secondary">
              {secondary.map(navLink)}
            </div>
          )}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="admin-sidebar-bottom-label">운영 담당 · {BUSINESS_INFO.administratorName}</span>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            쇼핑몰 확인 <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button
              type="button"
              className="admin-mobile-menu"
              aria-label="관리자 메뉴 열기"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="admin-topbar-breadcrumb">
              <span>운영 관리</span>
              <strong>{currentLabel}</strong>
            </div>
          </div>
          <div className="admin-topbar-actions">
            <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-topbar-store">
              <ArrowUpRight size={16} aria-hidden="true" />
              <span>쇼핑몰 보기</span>
            </Link>
            {signOut}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
