import { Suspense } from "react";
export default function Layout({ children }: { children: React.ReactNode }) { return <Suspense fallback={<main className="px-6 py-24 text-center">결제를 확인하고 있습니다…</main>}>{children}</Suspense>; }
