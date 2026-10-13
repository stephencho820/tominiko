"use client";
import {useEffect,useState} from "react";
export function BankTransferInstructions({orderId,token}:{orderId:string;token:string}){
 const [info,setInfo]=useState<{orderNumber:string;amount:number;bankName:string;accountNumber:string;accountHolder:string}|null>(null),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/bank-transfer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,accessToken:token})}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);return d}).then(setInfo).catch(e=>setError(e.message))},[orderId,token]);
 if(error)return <p role="alert">{error}</p>;
 if(!info)return <p>입금 계좌 확인 중…</p>;
 return <section className="bank-transfer-details"><p className="section-label">계좌이체 · 입금 대기</p><h2>주문이 접수되었습니다.</h2><p>주문번호: {info.orderNumber}</p><p>은행: <strong>{info.bankName}</strong></p><p>예금주: <strong>{info.accountHolder}</strong></p><p>계좌번호: <strong>{info.accountNumber}</strong> <button type="button" onClick={()=>navigator.clipboard.writeText(info.accountNumber)}>복사</button></p><p>입금하실 금액: <strong>₩{info.amount.toLocaleString("ko-KR")}</strong></p><p>은행 앱에서 직접 송금해 주세요. 자동 출금되지 않습니다. 실제 입금 확인 후 주문 준비가 시작됩니다.</p></section>;
}
