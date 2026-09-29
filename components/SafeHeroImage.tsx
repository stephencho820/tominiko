"use client";

import { useState } from "react";

export function SafeHeroImage({ src, fallback, alt }: { src: string; fallback: string; alt: string }) {
  const [current, setCurrent] = useState(src || fallback);
  return <img src={current} alt={alt} onError={() => { if (current !== fallback) setCurrent(fallback); }} />;
}
