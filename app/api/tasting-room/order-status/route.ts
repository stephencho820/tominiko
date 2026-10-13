import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tokenMatches } from "@/lib/order-access";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 let b:{orderId?:string;accessToken?:string};
 try{b=await request.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!b?.orderId||!uuid.test(b.orderId)||!b.accessToken||b.accessToken.length>256)return NextResponse.json({error:"Invalid order"},{status:400});
 const db=createServiceClient();
 const {data,error}=await db.from("orders").select("order_number,order_status,payment_status,payment_method,total,guest_access_token_hash,order_source,order_items(product_name,selected_option,quantity,subtotal)").eq("id",b.orderId).maybeSingle();
 if(error)return NextResponse.json({error:"Order unavailable"},{status:503});
 if(!data||data.order_source!=="tasting_room"||!tokenMatches(b.accessToken,data.guest_access_token_hash))return NextResponse.json({error:"Order not found"},{status:404});
 const {guest_access_token_hash:_secret,order_source:_source,...order}=data;
 return NextResponse.json({order},{headers:{"Cache-Control":"no-store"}});
}
