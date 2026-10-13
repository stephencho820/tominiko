"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import { createPortal } from "react-dom";
import { BankTransferInstructions } from "@/components/BankTransferInstructions";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/types";
import type { TastingMenuItem } from "@/services/tasting-menu";
import { defaultProductVariant,productImage } from "@/lib/products";

type Line={key:string;kind:"menu"|"bean";id:string;name:string;option:string;variantId?:string;price:number;quantity:number;image?:string};
const money=(n:number)=>`₩${n.toLocaleString("ko-KR")}`;
const newToken=()=>`${crypto.randomUUID()}${crypto.randomUUID()}`;
const TASTING_CART_KEY="casa-tasting-cart-v1";
const TASTING_CUSTOMER_KEY="casa-tasting-customer-v1";

export function TastingRoomOrderMenu({menu,beans}:{menu:TastingMenuItem[];beans:Product[]}) {
 const params=useSearchParams(); const qrTable=(params.get("table")||"").slice(0,30);
 const [lines,setLines]=useState<Line[]>([]),[added,setAdded]=useState(""),[open,setOpen]=useState(false),[checkout,setCheckout]=useState(false),[name,setName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[table,setTable]=useState(qrTable),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [hydrated,setHydrated]=useState(false);
 const submitRef=useRef(false),toastTimer=useRef<number|undefined>(undefined);
 useEffect(()=>()=>{if(toastTimer.current)window.clearTimeout(toastTimer.current)},[]);
 useEffect(()=>{try{const raw=localStorage.getItem(TASTING_CART_KEY);if(raw){const saved=JSON.parse(raw);if(Array.isArray(saved))setLines(saved)}const c=localStorage.getItem(TASTING_CUSTOMER_KEY);if(c){const v=JSON.parse(c);setName(v.name||"");setPhone(v.phone||"");setEmail(v.email||"");if(!qrTable)setTable(v.table||"")}}catch{}finally{setHydrated(true)}},[qrTable]);
 useEffect(()=>{if(!hydrated)return;try{localStorage.setItem(TASTING_CART_KEY,JSON.stringify(lines))}catch{}},[lines,hydrated]);
 useEffect(()=>{if(!hydrated)return;try{localStorage.setItem(TASTING_CUSTOMER_KEY,JSON.stringify({name,phone,email,table}))}catch{}},[name,phone,email,table,hydrated]);
 const total=useMemo(()=>lines.reduce((s,l)=>s+l.price*l.quantity,0),[lines]);
 const count=lines.reduce((s,l)=>s+l.quantity,0);
 useEffect(() => { if(!hydrated)return; window.dispatchEvent(new CustomEvent("tasting-cart-count",{detail:count})); },[count,hydrated]);
 const [paymentMethod,setPaymentMethod]=useState<"CARD"|"BANK_TRANSFER">("CARD");
 const [manualOrder,setManualOrder]=useState<{id:string;token:string}|null>(null);
 useEffect(() => {
   const showOrder = () => { if (manualOrder) return; setCheckout(false); setOpen(true); };
   window.addEventListener("tasting-open-order", showOrder);
   const onHash = () => { if (window.location.hash === "#order") showOrder(); };
   window.addEventListener("hashchange", onHash);
   onHash();
   return () => { window.removeEventListener("tasting-open-order", showOrder); window.removeEventListener("hashchange", onHash); };
 }, [manualOrder]);
 useEffect(() => {
   if (!open) return;
   const previousOverflow = document.body.style.overflow;
   document.body.style.overflow = "hidden";
   const onEscape = (event: KeyboardEvent) => {
     if (event.key === "Escape") { setOpen(false); setCheckout(false); setError(""); }
   };
   window.addEventListener("keydown", onEscape);
   return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onEscape); };
 }, [open]);
 const closeOrder = () => { setOpen(false); setCheckout(false); setError(""); };
 const add=(line:Omit<Line,"quantity">)=>{setCheckout(false);setLines(v=>{const found=v.find(x=>x.key===line.key);return found?v.map(x=>x.key===line.key?{...x,quantity:x.quantity+1}:x):[...v,{...line,quantity:1}]});setAdded(`${line.name} · ${line.option}`);if(toastTimer.current)window.clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setAdded(""),2200)};
 const qty=(key:string,d:number)=>setLines(v=>v.map(x=>x.key===key?{...x,quantity:x.quantity+d}:x).filter(x=>x.quantity>0));
 const addMenu=(item:TastingMenuItem,option:string)=>add({key:`menu:${item.id}:${option}`,kind:"menu",id:item.id,name:item.name,option,price:item.price});
 const addBean=(bean:Product)=>{const v=defaultProductVariant(bean,"150g");if(v?.available)add({key:`bean:${bean.id}:${v.id}`,kind:"bean",id:bean.id,name:bean.name,option:v.size,variantId:v.id,price:v.salePrice??v.price,image:productImage(bean)})};
 async function pay(){
   setError(""); if(!name.trim()){setError("주문자 이름을 입력해 주세요.");return} if(!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)){setError("휴대전화 번호를 확인해 주세요.");return} if(!lines.length)return;
   submitRef.current=true;setBusy(true);
   try{
    const idempotencyKey=crypto.randomUUID(),accessToken=newToken();
    sessionStorage.setItem("tasting-order-access-token",accessToken);
    const res=await fetch("/api/tasting-room/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName:name,phone,email,tableLabel:table,idempotencyKey,accessToken,paymentMethod,items:lines.map(l=>({kind:l.kind,id:l.id,variantId:l.variantId,option:l.kind==="menu"?(l.option==="STANDARD"?"":l.option):"",quantity:l.quantity}))})});
    const order=await res.json(); if(!res.ok)throw new Error(order.error||"주문을 만들지 못했습니다.");
    if(paymentMethod==="BANK_TRANSFER"){setManualOrder({id:order.orderId,token:accessToken});setLines([]);try{localStorage.removeItem(TASTING_CART_KEY)}catch{}setOpen(false);setBusy(false);submitRef.current=false;return;}
    if(!window.TossPayments){await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src="https://js.tosspayments.com/v2/standard";s.onload=()=>resolve();s.onerror=reject;document.head.appendChild(s)})}
    if(!window.TossPayments)throw new Error("결제 모듈을 시작하지 못했습니다.");
    await window.TossPayments(order.clientKey).payment({customerKey:window.TossPayments.ANONYMOUS}).requestPayment({method:paymentMethod,amount:{currency:"KRW",value:order.amount},orderId:order.orderId,orderName:order.orderName,successUrl:`${location.origin}/tasting-room/order/success`,failUrl:`${location.origin}/checkout/fail`,customerName:name,customerMobilePhone:phone.replace(/\D/g,""),customerEmail:email||undefined,...(paymentMethod==="CARD"?{card:{useEscrow:false,flowMode:"DEFAULT",useCardPoint:false,useAppCardOnly:false}}:{})});
   }catch(e){setError(e instanceof Error?e.message:"결제를 시작하지 못했습니다.");setBusy(false);submitRef.current=false}
 }
 const groups=[["brewed","BREWED COFFEE"],["espresso","ESPRESSO"],["non-coffee","NON-COFFEE"],["sweet","SWEET"]] as const;
 return <div>
  {manualOrder?<BankTransferInstructions orderId={manualOrder.id} token={manualOrder.token}/>:<>
  <section id="drinks" className="tasting-menu-section"><div className="tasting-menu-section-head"><p className="section-label">DRINKS</p><h2>At the bar</h2><span>QR에서 주문하고 바로 결제하세요.</span></div>
   <div className="tasting-drink-groups">{groups.map(([cat,label])=><article key={cat}><h3>{label}</h3>{menu.filter(m=>m.category===cat).map(item=><div className="tasting-drink-row tasting-order-row" key={item.id}><div><strong>{item.name}</strong><p>{item.description}</p><b>{money(item.price)}</b></div><div className="tasting-option-actions">{item.sold_out?<span>SOLD OUT</span>:<>{item.hot_available&&<button type="button" aria-label={`${item.name} HOT 담기`} onClick={()=>addMenu(item,"HOT")}>+ HOT</button>}{item.iced_available&&<button type="button" aria-label={`${item.name} ICE 담기`} onClick={()=>addMenu(item,"ICE")}>+ ICE</button>}{!item.hot_available&&!item.iced_available&&<button type="button" aria-label={`${item.name} 담기`} onClick={()=>addMenu(item,"STANDARD")}>+ ADD</button>}</>}</div></div>)}</article>)}</div>
  </section>
  <section id="beans" className="tasting-menu-section tasting-beans"><div className="tasting-menu-section-head"><p className="section-label">BEANS · TAKE HOME</p><h2>Coffee to take home</h2><span>음료와 원두를 한 번에 결제할 수 있습니다.</span></div>
   <div className="tasting-bean-grid">{beans.map(bean=>{const v=defaultProductVariant(bean,"150g");return <article className="tasting-bean-card" key={bean.id}><div className="tasting-bean-image"><img src={productImage(bean)} alt={bean.name}/></div><div><p className="section-label">{bean.origin}</p><h3>{bean.name}</h3><p>{bean.tasting_notes}</p><div className="tasting-bean-actions"><strong>{v?money(v.salePrice??v.price):"SOLD OUT"} <small>150g</small></strong><button type="button" disabled={!v?.available} onClick={()=>addBean(bean)}>{v?.available?"+ ADD":"SOLD OUT"}</button></div></div></article>})}</div>
  </section>
  {added&&<div className="tasting-added-toast" role="status">✓ {added} 담았습니다 · ORDER에서 확인하세요</div>}{count>0&&!open&&createPortal(<button type="button" className="tasting-cart-fab" onClick={()=>{setCheckout(false);setOpen(true)}}><span>ORDER · {count}</span><strong>{money(total)} →</strong></button>, document.body)}
  {open&&createPortal(<div className="tasting-order-overlay"><button type="button" className="tasting-order-backdrop" aria-label="주문창 닫기" onClick={closeOrder}/><div className="tasting-cart-sheet" role="dialog" aria-modal="true" aria-label="Review order"><button type="button" className="tasting-sheet-close" aria-label="주문창 닫기" onClick={closeOrder}>×</button><p className="section-label">YOUR ORDER</p><h2>{checkout?"Order details":"Review order"}</h2>
   {!checkout?<><div className="tasting-cart-lines">{lines.map(l=><div key={l.key}><span><strong>{l.name}</strong><small>{l.option}</small></span><span className="tasting-qty"><button type="button" onClick={()=>qty(l.key,-1)}>−</button>{l.quantity}<button type="button" onClick={()=>qty(l.key,1)}>+</button></span><b>{money(l.price*l.quantity)}</b></div>)}</div><div className="tasting-cart-total"><span>TOTAL</span><strong>{money(total)}</strong></div><button type="button" className="button-primary tasting-pay-button" onClick={()=>{setError("");setCheckout(true)}}>주문 정보 입력 →</button></>
   :<div className="tasting-quick-checkout"><label>이름<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>휴대전화<input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="010-0000-0000"/></label><label>이메일 <small>OPTIONAL</small><input value={email} onChange={e=>setEmail(e.target.value)} type="email"/></label><label>TABLE / PICK-UP <small>QR로 들어오면 자동 입력됩니다.</small><input value={table} onChange={e=>setTable(e.target.value)} placeholder="TAKE OUT"/></label><fieldset className="checkout-payment-method"><legend>결제 방법</legend><label><input type="radio" name="tasting-payment" checked={paymentMethod==="CARD"} onChange={()=>setPaymentMethod("CARD")}/> 카드 결제</label><label><input type="radio" name="tasting-payment" checked={paymentMethod==="BANK_TRANSFER"} onChange={()=>setPaymentMethod("BANK_TRANSFER")}/> 계좌이체 (직접 송금)</label></fieldset>{error&&<p className="submit-error">{error}</p>}<div className="tasting-cart-total"><span>PAYMENT</span><strong>{money(total)}</strong></div><button type="button" disabled={busy} className="button-primary tasting-pay-button" onClick={pay}>{busy?"결제 준비 중…":paymentMethod==="CARD"?"카드로 결제하기 →":"계좌이체로 주문하기 →"}</button><button type="button" className="tasting-back-button" onClick={()=>setCheckout(false)}>← 주문 수정</button></div>}
  </div></div>, document.body)}
  </>}
 </div>
}
