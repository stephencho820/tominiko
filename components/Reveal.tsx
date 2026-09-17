"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = { children: React.ReactNode; className?: string; variant?: "fade" | "up" | "scale"; delay?: number };

export function Reveal({ children, className = "", variant = "up", delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.18 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal reveal-${variant} ${visible ? "is-visible" : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>{children}</div>;
}

export function StaggerText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <Reveal variant="up" className={`stagger-text ${className}`}>{children}</Reveal>;
}
