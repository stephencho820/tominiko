"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {OrderStatusSelect} from "@/components/OrderStatusSelect";
type Item={id:string;product_name:string;selected_option:string|null;weight:string|null;quantity:number};
type Order={id:string;order_number:string;created_at:string;table_label:string|null;total:number;payment_status:string;payment_method:string|null;order_status:string;delivery_method:string;order_items:Item[]};
const clock=(d:string)=>new Date(d).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
export function TastingLiveOrders({initial}:{initial:Order[]}){
 const [orders,setOrders]=useState(initial),[error,setError]=useState(""),[sound,setSound]=useState(false),[lastUpdated,setLastUpdated]=useState("");
 const seen=useRef(new Set(initial.map(o=>o.id))),audio=useRef<AudioContext|null>(null),ready=useRef(false);
 const ping=useCallback(()=>{try{const ctx=audio.current;if(!ctx)return;const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type="sine";oscillator.frequency.setValueAtTime(880,ctx.currentTime);gain.gain.setValueAtTime(.12,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.23);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.23)}catch{}},[]);
 const refresh=useCallback(async()=>{try{const res=await fetch("/api/admin/tasting-live",{cache:"no-store"});if(!res.ok)throw Error("주문 정보를 갱신하지 못했습니다.");const data=await res.json();const incoming:Order[]=data.orders||[];
  const newPaid=incoming.some(o=>o.payment_status==="paid"&&!seen.current.has(o.id));
  if(ready.current&&newPaid&&sound)ping();
  incoming.forEach(o=>seen.current.add(o.id));ready.current=true;setOrders(incoming);setError("");setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
 }catch{setError("자동 새로고침에 실패했습니다. 연결 상태를 확인해 주세요.")}},[sound,ping]);
 useEffect(()=>{void refresh();const timer=window.setInterval(()=>{if(!document.hidden)void refresh()},5000);const onVisible=()=>{if(!document.hidden)void refresh()};document.addEventListener("visibilitychange",onVisible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",onVisible)}},[refresh]);
 async function enableSound(){try{const ctx=audio.current||new AudioContext();audio.current=ctx;await ctx.resume();setSound(true);ping()}catch{setError("이 브라우저에서 알림음을 사용할 수 없습니다.")}}
 const open=orders.filter(o=>!["completed","cancelled"].includes(o.order_status));
 return <main className="admin-main tasting-ops"><div className="admin-page-heading"><div><p className="eyebrow">LIVE · TASTING ROOM</p><h1>Order Board</h1><p>NEW → PREPARING → READY → COMPLETED · 5초마다 자동 갱신</p></div><span className="admin-count">{open.length} OPEN</span></div>
 <div className="tasting-live-toolbar"><button type="button" onClick={()=>void refresh()}>↻ 새로고침</button><button type="button" onClick={()=>void enableSound()} aria-pressed={sound}>{sound?"🔔 알림음 켜짐":"🔕 알림음 켜기"}</button><span>{lastUpdated?"최근 확인 "+lastUpdated:"주문 확인 중…"}</span></div>
 {error&&<p role="alert" className="submit-error">{error}</p>}
 <div className="tasting-ops-grid">{open.map(o=><article key={o.id} className={`tasting-ops-card status-${o.order_status}`}><header><div><Link href={`/admin/orders/${o.id}`}>{o.order_number}</Link><span>{clock(o.created_at)}</span></div><strong>{o.table_label||"TAKE OUT"}</strong></header><div className="tasting-ops-items">{(o.order_items||[]).map(i=><p key={i.id}><b>{i.quantity}×</b><span>{i.product_name}<small>{i.selected_option||i.weight}</small></span></p>)}</div><footer><span>₩{Number(o.total).toLocaleString("ko-KR")}</span>{o.payment_status==="paid"?<OrderStatusSelect key={o.id+o.order_status} id={o.id} initial={o.order_status} deliveryMethod={o.delivery_method} paymentStatus={o.payment_status} tastingRoom/>:<Link href={`/admin/orders/${o.id}`} className="is-danger">{o.payment_method==="BANK_TRANSFER"?"입금 확인 대기 →":"결제 대기 →"}</Link>}</footer></article>)}</div>
 {!open.length&&<p className="admin-empty">현재 준비할 Tasting Room 주문이 없습니다.</p>}
 <details className="admin-closed-orders"><summary>Completed & cancelled</summary><div className="admin-order-list">{orders.filter(o=>["completed","cancelled"].includes(o.order_status)).map(o=><Link className="admin-order-card" href={`/admin/orders/${o.id}`} key={o.id}>{o.order_number} · {o.table_label||"TAKE OUT"} · {clock(o.created_at)}</Link>)}</div></details></main>
}
