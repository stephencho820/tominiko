"use client";
import { useEffect,useState } from "react";
type Data={days:number;truncated:boolean;sessions:number;pageViews:number;events:Record<string,number>;orders:number;paidOrders:number;revenue:number;topPages:[string,number][];sources:[string,number][];devices:[string,number][];daily:{date:string;views:number;sessions:number}[]};
export function AnalyticsDashboard(){
 const [days,setDays]=useState(30),[data,setData]=useState<Data|null>(null),[error,setError]=useState("");
 useEffect(()=>{let active=true;fetch("/api/admin/analytics?days="+days,{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("분석 정보를 불러오지 못했습니다.");return r.json()}).then(d=>{if(active){setData(d);setError("")}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[days]);
 const number=(n:number)=>n.toLocaleString("ko-KR");
 const stages=[["방문 세션",data?.sessions||0],["상품 조회",data?.events.product_view||0],["장바구니 추가",data?.events.add_to_cart||0],["결제 시작",data?.events.checkout_start||0],["주문 완료",data?.events.order_placed||0]] as const;
 return <section className="admin-panel"><div className="mb-5 flex gap-2">{[7,30,90].map(n=><button key={n} type="button" onClick={()=>setDays(n)} className="border rounded px-4 py-2" style={{fontWeight:days===n?700:400}}>{n}일</button>)}</div>
 {error&&<p role="alert">{error}</p>}{!data?<p>분석 데이터 로딩 중…</p>:<>
 {data.truncated&&<p role="alert">이벤트 20,000건까지만 표시됩니다. 긴 기간의 수치는 일부 누락될 수 있습니다.</p>}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">{[["방문 세션",number(data.sessions)],["페이지 조회",number(data.pageViews)],["주문 건수",number(data.orders)],["결제 완료 매출", "₩"+number(data.revenue)]].map(([label,value])=><div key={label} className="border rounded-lg p-4"><p className="text-sm">{label}</p><strong className="text-2xl">{value}</strong></div>)}</div>
 <h2 className="text-xl font-semibold mb-3">구매 행동 퍼널</h2><div className="grid gap-3 mb-8">{stages.map(([label,count])=><div key={label} className="flex items-center gap-4"><span className="w-28 text-sm">{label}</span><div className="flex-1 rounded bg-gray-100 h-6 overflow-hidden"><div className="bg-stone-500 h-full" style={{width:`${Math.max(0,Math.min(100,count/Math.max(1,stages[0][1])*100))}%`}}/></div><strong className="w-16 text-right">{number(count)}</strong></div>)}</div>
 <p className="text-sm mb-8">각 단계는 이벤트 발생 횟수이며, 동일 고객의 단계별 전환율이 아닙니다. 주문 완료는 추적 이벤트 기준입니다.</p>
 <div className="grid md:grid-cols-2 gap-8">{[["인기 페이지",data.topPages],["유입 경로",data.sources],["기기",data.devices]].map(([heading,entries])=><div key={heading as string}><h2 className="text-xl font-semibold mb-3">{heading as string}</h2><div className="grid gap-2">{(entries as [string,number][]).map(([name,count])=><div key={name} className="flex justify-between gap-4 border-b py-2"><span className="break-all">{name}</span><strong>{number(count)}</strong></div>)}</div></div>)}</div>
 <p className="mt-8 text-sm">이 분석은 설치 이후 발생한 방문 이벤트만 집계합니다. 광고 차단·브라우저 제한 등에 따라 실제 방문 수와 차이가 날 수 있습니다.</p>
 </>}</section>
}
