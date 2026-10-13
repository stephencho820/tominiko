"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {getSavedTastingOrders} from "@/lib/tasting-order-history";
type Item={product_name:string;selected_option:string|null;quantity:number;subtotal:number};
type Order={id?:string;order_number:string;order_status:string;payment_status:string;payment_method:string|null;total:number;created_at?:string;order_items:Item[]};
const labels:Record<string,string>={new:"주문 접수",confirmed:"주문 확인",preparing:"제조 중",ready_for_pickup:"픽업 준비 완료",completed:"픽업 완료",cancelled:"취소"};
function state(o:Order){return o.order_status==="cancelled"?"주문 취소":o.payment_status!=="paid"?(o.payment_method==="BANK_TRANSFER"?"입금 대기":"결제 대기"):labels[o.order_status]||"주문 확인 중"}
export default function TastingOrderHistory(){
 const [orders,setOrders]=useState<Order[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let active=true;async function load(){
  const saved=getSavedTastingOrders();
  try{
   const [member,guests]=await Promise.all([
    fetch("/api/tasting-room/my-orders",{cache:"no-store"}).then(r=>r.ok?r.json():{orders:[]}),
    Promise.all(saved.map(async entry=>{try{const r=await fetch("/api/tasting-room/order-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:entry.id,accessToken:entry.token}),cache:"no-store"});if(!r.ok)return null;const data=await r.json();return {...data.order,id:entry.id,created_at:entry.savedAt?new Date(entry.savedAt).toISOString():undefined} as Order}catch{return null}}))
   ]);
   const all:Order[]=[...(member.orders||[]),...guests.filter((o):o is Order=>o!==null)];
   const unique=[...new Map(all.map(o=>[o.id||o.order_number,o])).values()].sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));
   if(active)setOrders(unique);
  }catch{if(active)setError("주문 내역을 불러오지 못했습니다. 다시 시도해 주세요.")}
  finally{if(active)setLoading(false)}
 }void load();return()=>{active=false}},[]);
 return <main className="tasting-history-page"><p className="section-label">CASA DI STEFANO · TASTING ROOM</p><h1>My Orders</h1><p className="tasting-history-intro">주문한 커피와 준비 상태를 한곳에서 확인하세요.</p>
 {loading?<p role="status">주문 내역을 불러오는 중…</p>:error?<p role="alert">{error}</p>:orders.length?<div className="tasting-history-list">{orders.map(o=><article className="tasting-history-card" key={o.id||o.order_number}><div className="tasting-history-card-head"><span className="tasting-history-number">{o.order_number}</span><span className="tasting-history-badge">{state(o)}</span></div><div className="tasting-history-items">{o.order_items?.map((item,i)=><p key={i}>{item.product_name} <small>{item.selected_option||""} × {item.quantity}</small></p>)}</div><div className="tasting-history-card-foot"><strong>₩{Number(o.total).toLocaleString("ko-KR")}</strong><span>{o.created_at?new Date(o.created_at).toLocaleDateString("ko-KR"):""}</span></div></article>)}</div>:<div className="tasting-history-empty"><h2>아직 주문 내역이 없어요.</h2><p>이 기기에서 주문하거나 로그인하면 주문 내역이 여기에 표시됩니다.</p></div>}
 <p className="tasting-history-help">비회원 주문은 이 브라우저에 저장된 조회 정보로 표시됩니다. 브라우저 데이터를 삭제하거나 다른 기기를 사용하면 이전 주문이 보이지 않을 수 있어요.</p>
 <div className="tasting-history-actions"><Link className="button-primary" href="/tasting-room/menu">메뉴로 돌아가기 →</Link><Link href="/account">MY ACCOUNT →</Link></div></main>
}
