import { Suspense } from "react";
import { TastingSuccessClient } from "./TastingSuccessClient";

export default function TastingSuccessPage(){
 return <Suspense fallback={<main className="tasting-order-result"><p className="section-label">PAYMENT</p><h1>결제를 확인하고 있습니다…</h1></main>}><TastingSuccessClient /></Suspense>;
}
