import Link from "next/link";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="grain relative flex aspect-[4/5] items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="px-6 text-center">
            <span className="section-label">Coffee / {product.origin}</span>
            <span className="mt-3 block text-4xl italic text-[var(--brown)]">Casa</span>
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-[var(--paper)]/90 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[.12em] text-[var(--brown)]">
          {product.todays_roast ? (
            <>
              <span className="lang-ko">오늘의 로스트</span>
              <span className="lang-en">Today&apos;s roast</span>
            </>
          ) : (
            <>
              <span className="lang-ko">스몰 배치</span>
              <span className="lang-en">Small batch</span>
            </>
          )}
        </span>
      </div>

      <div className="product-card-meta flex justify-between gap-4 border-b border-[var(--line)] pb-4 pt-4">
        <div className="min-w-0 flex-1">
          <h3 className="product-card-name text-lg leading-tight transition-colors group-hover:text-[var(--brown)]">
            {product.name}
          </h3>
          <p className="sans mt-1 text-[10px] uppercase tracking-[.1em] text-[var(--muted)]">
            {product.origin} · {product.process ?? "Small batch"}
          </p>
          <p className="sans mt-2 text-[9px] uppercase tracking-[.12em] text-[var(--muted)]">
            Roasted by ZERO DEGREES
          </p>
        </div>

        <p className="sans whitespace-nowrap text-right text-sm font-semibold">
          <span className="block text-[var(--accent)]">₩{product.price_150g.toLocaleString()}</span>
          {product.price_150g_original && (
            <del className="block text-xs font-normal text-[var(--muted)]">
              ₩{product.price_150g_original.toLocaleString()}
            </del>
          )}
          <span className="block text-[10px] font-normal uppercase tracking-[.1em] text-[var(--muted)]">
            150g
          </span>
        </p>
      </div>
    </Link>
  );
}
