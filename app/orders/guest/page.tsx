"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Order = {order_number:string;order_status:string;payment_status:string;delivery_method:string;total:number;created_at:string;order_items:{product_name:string;weight:string;grind:string;quantity:number;subtotal:number}[]};
export default function GuestOnlineOrders() {
  const [orderId,setOrderId]=useState("");
  const [accessToken,setAccessToken]=useState("");
  const [order,setOrder]=useState<Order|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  useEffect(() => { try { const saved = JSON.parse(sessionStorage.getItem("tominiko-last-online-order") || "null"); if (saved && typeof saved.id === "string" && typeof saved.token === "string") { setOrderId(saved.id); setAccessToken(saved.token); } } catch { /* Manual entry remains available. */ } }, []);
  async function lookup(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");setOrder(null);
    try {
      const response=await fetch("/api/orders/guest-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:orderId.trim(),accessToken:accessToken.trim()}),cache:"no-store"});
      if(!response.ok)throw new Error("조회 정보가 일치하지 않거나 주문을 찾을 수 없습니다.");
      const result=await response.json();setOrder(result.order);
    }catch(e){setError(e instanceof Error?e.message:"주문 조회에 실패했습니다.");}
    finally{setLoading(false);}
  }
  return <main className="mx-auto max-w-2xl px-6 py-16 md:py-24"><p className="section-label">CASA DI STEFANO · ORDER LOOKUP</p><h1 className="mt-4 text-4xl md:text-5xl">Guest Order Lookup</h1><p className="mt-5 text-[var(--muted)]">비회원 온라인 주문 시 발급된 주문 ID와 접근 토큰으로 결제 및 배송·픽업 상태를 조회합니다. 주문 번호만으로는 조회할 수 없습니다. 방금 이 브라우저에서 주문했다면 조회 정보가 자동 입력됩니다.</p>
  <form onSubmit={lookup} className="mt-10 space-y-5"><label className="block">주문 ID<input required value={orderId} onChange={e=>setOrderId(e.target.value)} autoComplete="off" className="mt-2 w-full border p-3" placeholder="주문 UUID"/></label><label className="block">주문 접근 토큰<input required value={accessToken} onChange={e=>setAccessToken(e.target.value)} autoComplete="off" className="mt-2 w-full border p-3" placeholder="결제 시 발급된 토큰"/></label><button disabled={loading} className="button-primary px-6 py-3" type="submit">{loading?"조회 중…":"주문 조회하기 ↗"}</button></form>
  {error&&<p role="alert" className="mt-5 text-red-700">{error}</p>}
  {order&&<section className="mt-10 border-t border-[var(--line)] pt-6"><h2 className="text-2xl">{order.order_number}</h2><p className="mt-3">결제: {order.payment_status} · 주문: {order.order_status} · 수령: {order.delivery_method}</p><div className="mt-5 space-y-3">{order.order_items?.map((item,i)=><p key={i}>{item.product_name} · {item.weight} · {item.grind} × {item.quantity}</p>)}</div><strong className="mt-5 block text-xl">₩{Number(order.total).toLocaleString("ko-KR")}</strong></section>}
  <p className="mt-10 text-sm text-[var(--muted)]">접근 토큰이 없다면 보안상 주문 번호만으로는 조회할 수 없습니다. <a href="https://open.kakao.com/o/sDj2GOzi" target="_blank" rel="noopener noreferrer" className="underline">카카오톡으로 문의해 주세요 ↗</a></p><Link href="/account/orders" className="mt-5 inline-block">회원 주문 내역 →</Link></main>;
}
