"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type TransferInfo = { orderNumber:string; amount:number; bankName:string; accountNumber:string; accountHolder:string };

export function BankTransferInstructions({ orderId, token }: { orderId:string; token:string }) {
  const [info,setInfo]=useState<TransferInfo|null>(null);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/bank-transfer",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({orderId,accessToken:token}),signal:controller.signal
    }).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"계좌 정보를 불러오지 못했습니다.");
      return data as TransferInfo;
    }).then(setInfo).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"계좌 정보를 불러오지 못했습니다.");});
    return ()=>controller.abort();
  },[orderId,token]);

  const copyAccount=async()=>{
    if(!info)return;
    try{
      await navigator.clipboard.writeText(info.accountNumber);
      setCopied(true);
    }catch{
      setCopied(false);
      setError("복사하지 못했습니다. 계좌번호를 직접 선택해 주세요.");
    }
  };

  if(error&&!info)return <main className="bank-transfer-page"><section className="bank-transfer-panel"><p role="alert">{error}</p><Link href="/tasting-room/menu">메뉴로 돌아가기 →</Link></section></main>;
  if(!info)return <main className="bank-transfer-page"><section className="bank-transfer-panel" role="status">입금 계좌 정보를 확인하고 있습니다…</section></main>;

  return <main className="bank-transfer-page">
    <section className="bank-transfer-panel" aria-labelledby="transfer-title">
      <p className="bank-transfer-eyebrow">CASA DI STEFANO · TASTING ROOM</p>
      <div className="bank-transfer-step"><span className="bank-transfer-step-dot"/> 계좌이체 · 입금 대기</div>
      <h1 id="transfer-title">주문이 접수되었어요.</h1>
      <p className="bank-transfer-intro">아래 계좌로 입금해 주시면 확인 후 주문 준비를 시작합니다.</p>

      <div className="bank-transfer-order-id"><span>ORDER NUMBER</span><strong>{info.orderNumber}</strong></div>

      <div className="bank-transfer-account">
        <p className="bank-transfer-account-label">입금 계좌</p>
        <p className="bank-transfer-bank">{info.bankName} <span>· {info.accountHolder}</span></p>
        <div className="bank-transfer-account-line"><strong>{info.accountNumber}</strong><button type="button" onClick={copyAccount} aria-label="계좌번호 복사">{copied?"복사됨 ✓":"복사"}</button></div>
      </div>

      <div className="bank-transfer-amount"><span>입금하실 금액</span><strong>₩{info.amount.toLocaleString("ko-KR")}</strong></div>
      <p className="bank-transfer-notice">은행 앱에서 직접 송금해 주세요. 자동 출금되지 않으며, 실제 입금이 확인된 뒤 제조가 시작됩니다.</p>
      {error&&<p className="bank-transfer-copy-error" role="status">{error}</p>}
      <Link className="bank-transfer-primary" href="/tasting-room/order/status">주문 상태 확인 <span aria-hidden="true">→</span></Link>
      <p className="bank-transfer-footnote">주문번호를 보관해 주세요. 픽업 준비가 완료되면 카운터에서 안내해 드립니다.</p>
    </section>
    <nav className="bank-transfer-links" aria-label="다른 페이지"><Link href="/tasting-room/order/history">MY ORDERS →</Link><Link href="/tasting-room">← TASTING ROOM</Link><Link href="/shop">ONLINE SHOP →</Link></nav>
  </main>;
}
