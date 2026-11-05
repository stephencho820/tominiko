import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";
export async function GET(request: Request) {
 if (!await getAdminClient()) return NextResponse.json({error:"Forbidden"},{status:403});
 const days = Math.min(90,Math.max(1,Number(new URL(request.url).searchParams.get("days")) || 30));
 const since = new Date(Date.now()-days*86400000).toISOString();
 const db = createServiceClient();
 const { data: events, error } = await db.from("site_analytics_events").select("created_at,session_id,event_name,path,source,device").gte("created_at",since).order("created_at",{ascending:false}).limit(20000);
 if (error) return NextResponse.json({error:"Analytics unavailable"},{status:503});
 const rows = events ?? [];
 const sessions = new Set(rows.map(x=>x.session_id));
 const eventCounts: Record<string,number> = {};
 const paths: Record<string,number> = {};
 const sources: Record<string,number> = {};
 const devices: Record<string,number> = {};
 const daily: Record<string,{date:string;views:number;sessions:Set<string>}> = {};
 for (const e of rows) {
   eventCounts[e.event_name]=(eventCounts[e.event_name]||0)+1;
   if(e.event_name==="page_view"){
     paths[e.path]=(paths[e.path]||0)+1;
     sources[e.source]=(sources[e.source]||0)+1;
     devices[e.device]=(devices[e.device]||0)+1;
     const date=e.created_at.slice(0,10);
     if(!daily[date])daily[date]={date,views:0,sessions:new Set()};
     daily[date].views++;daily[date].sessions.add(e.session_id);
   }
 }
 const { data: orders } = await db.from("orders").select("total,payment_status,created_at,user_id").gte("created_at",since).limit(20000);
 const orderRows=orders??[];
 const paid=orderRows.filter(o=>o.payment_status==="paid");
 return NextResponse.json({
   days, truncated:rows.length===20000, sessions:sessions.size, pageViews:eventCounts.page_view||0,
   events:eventCounts, orders:orderRows.length, paidOrders:paid.length,
   revenue:paid.reduce((sum,o)=>sum+Number(o.total||0),0),
   topPages:Object.entries(paths).sort((a,b)=>b[1]-a[1]).slice(0,10),
   sources:Object.entries(sources).sort((a,b)=>b[1]-a[1]).slice(0,10),
   devices:Object.entries(devices),
   daily:Object.values(daily).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({date:d.date,views:d.views,sessions:d.sessions.size})),
 },{headers:{"Cache-Control":"no-store"}});
}
