"use client";
import { useMemo,useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/types";
import type { TastingMenuItem } from "@/services/tasting-menu";
import { defaultProductVariant,productImage } from "@/lib/products";

type Line={key:string;kind:"menu"|"bean";id:string;name:string;option:string;variantId?:string;price:number;quantity:number;image?:string};
const money=(n:number)=>`₩${n.toLocaleString("ko-KR")}`;
const newToken=()=>`${crypto.randomUUID()}${crypto.randomUUID()}`;

export function TastingRoomOrderMenu({menu,beans}:{menu:TastingMenuItem[];beans:Product[]}) {
 const params=useSearchParams(); const qrTable=(params.get("table")||"").slice(0,30);
 const [lines,setLines]=useState<Line[]>([]),[open,setOpen]=useState(false),[checkout,setCheckout]=useState(false),[name,setName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[table,setTable]=useState(qrTable),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const total=useMemo(()=>lines.reduce((s,l)=>s+l.price*l.quantity,0),[lines]);
 const count=lines.reduce((s,l)=>s+l.quantity,0);
 const add=(line:Omit<Line,"quantity">)=>setLines(v=>{const found=v.find(x=>x.key===line.key);return found?v.map(x=>x.key===line.key?{...x,quantity:x.quantity+1}:x):[...v,{...line,quantity:1}]});
 const qty=(key:string,d:number)=>setLines(v=>v.map(x=>x.key===key?{...x,quantity:x.quantity+d}:x).filter(x=>x.quantity>0));
 const addMenu=(item:TastingMenuItem,option:string)=>add({key:`menu:${item.id}:${option}`,kind:"menu",id:item.id,name:item.name,option,price:item.price});
 const addBean=(bean:Product)=>{const v=defaultProductVariant(bean,"150g");if(v?.available)add({key:`bean:${bean.id}:${v.id}`,kind:"bean",id:bean.id,name:bean.name,option:v.size,variantId:v.id,price:v.salePrice??v.price,image:productImage(bean)})};
 async function pay(){
   setError(""); if(!name.trim()){setError("주문자 이름을 입력해 주세요.");return} if(!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)){setError("휴대전화 번호를 확인해 주세요.");return} if(!lines.length)return;
   setBusy(true);
   try{
    const idempotencyKey=crypto.randomUUID(),accessToken=newToken();
    sessionStorage.setItem("tasting-order-access-token",accessToken);
    const res=await fetch("/api/tasting-room/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName:name,phone,email,tableLabel:table,idempotencyKey,accessToken,items:lines.map(l=>({kind:l.kind,id:l.id,variantId:l.variantId,option:l.kind==="menu"?l.option:"",quantity:l.quantity}))})});
    const order=await res.json(); if(!res.ok)throw new Error(order.error||"주문을 만들지 못했습니다.");
    if(!window.TossPayments){await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src="https://js.tosspayments.com/v2/standard";s.onload=()=>resolve();s.onerror=reject;document.head.appendChild(s)})}
    if(!window.TossPayments)throw new Error("결제 모듈을 시작하지 못했습니다.");
    await window.TossPayments(order.clientKey).payment({customerKey:window.TossPayments.ANONYMOUS}).requestPayment({method:"CARD",amount:{currency:"KRW",value:order.amount},orderId:order.orderId,orderName:order.orderName,successUrl:`${location.origin}/tasting-room/order/success`,failUrl:`${location.origin}/checkout/fail`,customerName:name,customerMobilePhone:phone.replace(/\D/g,""),customerEmail:email||undefined,card:{useEscrow:false,flowMode:"DEFAULT",useCardPoint:false,useAppCardOnly:false}});
   }catch(e){setError(e instanceof Error?e.message:"결제를 시작하지 못했습니다.");setBusy(false)}
 }
 const groups=[["brewed","BREWED COFFEE"],["espresso","ESPRESSO"],["non-coffee","NON-COFFEE"],["sweet","SWEET"]] as const;
 return <div>
  <section id="drinks" className="tasting-menu-section"><div className="tasting-menu-section-head"><p className="section-label">DRINKS</p><h2>At the bar</h2><span>QR에서 주문하고 바로 결제하세요.</span></div>
   <div className="tasting-drink-groups">{groups.map(([cat,label])=><article key={cat}><h3>{label}</h3>{menu.filter(m=>m.category===cat).map(item=><div className="tasting-drink-row tasting-order-row" key={item.id}><div><strong>{item.name}</strong><p>{item.description}</p><b>{money(item.price)}</b></div><div className="tasting-option-actions">{item.sold_out?<span>SOLD OUT</span>:<>{item.hot_available&&<button onClick={()=>addMenu(item,"HOT")}>+ HOT</button>}{item.iced_available&&<button onClick={()=>addMenu(item,"ICE")}>+ ICE</button>}{!item.hot_available&&!item.iced_available&&<button onClick={()=>addMenu(item,"STANDARD")}>+ ADD</button>}</>}</div></div>)}</article>)}</div>
  </section>
  <section id="beans" className="tasting-menu-section tasting-beans"><div className="tasting-menu-section-head"><p className="section-label">BEANS · TAKE HOME</p><h2>Coffee to take home</h2><span>음료와 원두를 한 번에 결제할 수 있습니다.</span></div>
   <div className="tasting-bean-grid">{beans.map(bean=>{const v=defaultProductVariant(bean,"150g");return <article className="tasting-bean-card" key={bean.id}><div className="tasting-bean-image"><img src={productImage(bean)} alt={bean.name}/></div><div><p className="section-label">{bean.origin}</p><h3>{bean.name}</h3><p>{bean.tasting_notes}</p><div className="tasting-bean-actions"><strong>{v?money(v.salePrice??v.price):"SOLD OUT"} <small>150g</small></strong><button disabled={!v?.available} onClick={()=>addBean(bean)}>{v?.available?"+ ADD":"SOLD OUT"}</button></div></div></article>})}</div>
  </section>
  {count>0&&<button className="tasting-cart-fab" onClick={()=>setOpen(true)}><span>ORDER · {count}</span><strong>{money(total)} →</strong></button>}
  {open&&<div className="tasting-cart-sheet" role="dialog" aria-modal="true"><button className="tasting-sheet-close" onClick={()=>setOpen(false)}>×</button><p className="section-label">YOUR ORDER</p><h2>{checkout?"Order details":"Review order"}</h2>
   {!checkout?<><div className="tasting-cart-lines">{lines.map(l=><div key={l.key}><span><strong>{l.name}</strong><small>{l.option}</small></span><span className="tasting-qty"><button onClick={()=>qty(l.key,-1)}>−</button>{l.quantity}<button onClick={()=>qty(l.key,1)}>+</button></span><b>{money(l.price*l.quantity)}</b></div>)}</div><div className="tasting-cart-total"><span>TOTAL</span><strong>{money(total)}</strong></div><button className="button-primary tasting-pay-button" onClick={()=>setCheckout(true)}>주문 정보 입력 →</button></>
   :<div className="tasting-quick-checkout"><label>이름<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>휴대전화<input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="010-0000-0000"/></label><label>이메일 <small>OPTIONAL</small><input value={email} onChange={e=>setEmail(e.target.value)} type="email"/></label><label>TABLE / PICK-UP <small>QR로 들어오면 자동 입력됩니다.</small><input value={table} onChange={e=>setTable(e.target.value)} placeholder="TAKE OUT"/></label>{error&&<p className="submit-error">{error}</p>}<div className="tasting-cart-total"><span>PAYMENT</span><strong>{money(total)}</strong></div><button disabled={busy} className="button-primary tasting-pay-button" onClick={pay}>{busy?"결제 준비 중…":"카드로 결제하기 →"}</button><button className="tasting-back-button" onClick={()=>setCheckout(false)}>← 주문 수정</button></div>}
  </div>}
 </div>
}
