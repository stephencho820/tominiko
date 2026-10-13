"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export function ConfirmBankTransfer({id}:{id:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");const router=useRouter();
 async function confirm(){
  if(!window.confirm("실제 은행 입금 내역과 주문 금액을 확인했나요? 확인 후 재고가 차감됩니다."))return;
  setBusy(true);setError("");
  try{const r=await fetch("/api/admin/orders/confirm-transfer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"처리 실패");router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"처리 실패")}finally{setBusy(false)}
 }
 return <div><button className="admin-primary-button" disabled={busy} type="button" onClick={confirm}>{busy?"확인 중…":"계좌 입금 확인 · 결제 완료 처리"}</button>{error&&<p role="alert" className="submit-error">{error}</p>}</div>;
}
