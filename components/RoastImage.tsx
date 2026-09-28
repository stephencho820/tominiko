"use client";

import { useState } from "react";

export function RoastImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="todays-roast-image--failed" aria-hidden="true" />;
  }

  return (
    <div className="todays-roast-image grain">
      <img src={src} alt={alt} onError={() => setFailed(true)} />
    </div>
  );
}
