"use client";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import {useEffect,useState} from "react";

type Order={order_number:string;order_status:string;payment_status:string;payment_method:string|null;total:number;order_items:{product_name:string;selected_option:string|null;quantity:number;subtotal:number}[]};
const statusLabel:Record<string,string>={new:"주문 접수",confirmed:"주문 확인",preparing:"준비 중",ready_for_pickup:"픽업 준비 완료",completed:"픽업 완료",cancelled:"주문 취소"};
export default function PickupStatusPage(){
 const [order,setOrder]=useState<Order|null>(null),[message,setMessage]=useState("주문을 불러오는 중…");
 useEffect(()=>{
  let active=true;let timer:ReturnType<typeof setInterval>;
  const refresh=async()=>{
   let saved:{id:string;token:string}|null=null;
   try{
    const {data:{user}}=await createClient().auth.getUser();
    if(user){if(active)setMessage("로그인 계정의 주문은 내 주문 내역에서 확인해 주세요.");return}
    saved=JSON.parse(localStorage.getItem("tasting-last-order")||"null");
   }catch{}
   if(!saved?.id||!saved.token){if(active)setMessage("저장된 주문이 없습니다. 주문 완료 화면에서 주문번호를 확인해 주세요.");return}
   try{
    const res=await fetch("/api/tasting-room/order-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:saved.id,accessToken:saved.token}),cache:"no-store"});
    const data=await res.json();if(!res.ok)throw Error(data.error||"주문 조회 실패");
    if(active){setOrder(data.order);setMessage("")}
   }catch{if(active)setMessage("주문 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.")}
  };
  void refresh();timer=setInterval(()=>void refresh(),10000);
  return()=>{active=false;clearInterval(timer)};
 },[]);
 return <main className="tasting-order-result"><p className="section-label">CASA DI STEFANO · TASTING ROOM</p><div className="tasting-pickup-card"><p className="section-label">COUNTER PICK-UP · ORDER STATUS</p><h1 className="tasting-pickup-number">{order?.order_number||"YOUR ORDER"}</h1><p>주문번호가 불리면 카운터에서 픽업해 주세요.</p></div>
 {order?<><h2>{order.payment_status!=="paid"?(order.payment_method==="BANK_TRANSFER"?"입금 확인 대기":"결제 확인 대기"):statusLabel[order.order_status]||"주문 확인 중"}</h2><p>{order.payment_status==="paid"&&order.order_status==="ready_for_pickup"?"커피가 준비되었습니다. 주문번호를 보여주고 카운터에서 픽업해 주세요.":order.payment_status!=="paid"?"결제 확인 후 제조가 시작됩니다.":"주문번호가 불리면 카운터에서 픽업해 주세요."}</p><section>{order.order_items.map((item,i)=><div key={i}><span>{item.product_name}<small>{item.selected_option||""} × {item.quantity}</small></span><b>₩{item.subtotal.toLocaleString("ko-KR")}</b></div>)}</section><div className="tasting-result-total"><span>TOTAL</span><strong>₩{order.total.toLocaleString("ko-KR")}</strong></div></>:<p role="status">{message}</p>}
 <Link className="button-primary tasting-result-link" href="/tasting-room/order/history">내 주문 내역 →</Link><Link href="/tasting-room/menu">메뉴로 돌아가기</Link></main>;
}
