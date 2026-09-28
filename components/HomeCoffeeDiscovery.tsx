"use client";

import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { Product } from "@/types";
import { CoffeeDiscovery } from "./CoffeeDiscovery";

type Props = { products: Product[] };
type State = { failed: boolean };

/**
 * The discovery experience is an enhancement, not a requirement for reaching
 * the home page. Keep a product-data or browser-only failure inside this
 * section instead of allowing Next.js to replace the entire route with its
 * global client error screen.
 */
export class HomeCoffeeDiscovery extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Coffee discovery failed to render", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <section className="coffee-discovery discovery-empty" aria-labelledby="discovery-fallback-title">
          <p className="section-label">Coffee</p>
          <h2 id="discovery-fallback-title">
            <span className="lang-ko">오늘 준비된 커피를 만나보세요.</span>
            <span className="lang-en">Discover today&apos;s coffees.</span>
          </h2>
          <p>
            <span className="lang-ko">취향 찾기를 불러오지 못했지만 모든 커피는 정상적으로 둘러볼 수 있어요.</span>
            <span className="lang-en">Coffee discovery is unavailable, but the full collection is ready to browse.</span>
          </p>
          <Link href="/shop" className="button-primary home-shop-link">
            <span className="lang-ko">모든 커피 보기</span>
            <span className="lang-en">Browse all coffee</span> →
          </Link>
        </section>
      );
    }

    return <CoffeeDiscovery products={this.props.products} />;
  }
}
