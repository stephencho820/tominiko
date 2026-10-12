import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashAccessToken } from "@/lib/order-access";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text=(v:unknown,n=200)=>typeof v==="string"?v.trim().slice(0,n):"";
export async function POST(request:Request){
 let b:any;try{b=await request.json()}catch{return NextResponse.json({error:"요청 형식이 올바르지 않습니다."},{status:400})}
 const manual=b?.paymentMethod==="BANK_TRANSFER";
 const items=Array.isArray(b?.items)?b.items:[];
 if(!text(b?.customerName,100)||!/^01[016789]-?\d{3,4}-?\d{4}$/.test(text(b?.phone,30))||(text(b?.email,254)&&!/^\S+@\S+\.\S+$/.test(text(b.email,254)))||!uuid.test(text(b?.idempotencyKey))||text(b?.accessToken,256).length<32||!items.length||items.length>20)
  return NextResponse.json({error:"주문 정보를 다시 확인해 주세요."},{status:400});
 if(items.some((i:any)=>!i||!["menu","bean"].includes(i.kind)||!uuid.test(text(i.id))||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20||(i.kind==="bean"&&!text(i.variantId,128))))
  return NextResponse.json({error:"메뉴 옵션을 다시 확인해 주세요."},{status:400});
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY||(!manual&&!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY))return NextResponse.json({error:"결제 환경이 아직 설정되지 않았습니다."},{status:503});
 const supabase=createServiceClient(),tokenHash=hashAccessToken(text(b.accessToken,256));
 const {data,error}=await supabase.rpc("create_tasting_room_order",{p_client_reference:text(b.idempotencyKey),p_guest_token_hash:tokenHash,p_customer_name:text(b.customerName,100),p_phone:text(b.phone,30),p_email:text(b.email,254).toLowerCase(),p_table_label:text(b.tableLabel,30),p_items:items.map((i:any)=>({kind:i.kind,id:text(i.id),variant_id:text(i.variantId,128),option:text(i.option,20),quantity:i.quantity}))});
 if(error||!data?.[0])return NextResponse.json({error:error?.message?.includes("stock")||error?.message?.includes("unavailable")?"품절되었거나 주문할 수 없는 메뉴가 있습니다.":"주문을 만들지 못했습니다. 다시 시도해 주세요."},{status:409});
 const o=data[0];if(o.token_matches===false)return NextResponse.json({error:"이미 처리된 주문입니다."},{status:409});
 if(manual){
  const {data:bank}=await supabase.from("manual_transfer_settings").select("id").eq("id",true).maybeSingle();
  if(!bank)return NextResponse.json({error:"계좌이체가 아직 준비되지 않았습니다."},{status:503});
  const {data:marked,error:markError}=await supabase.from("orders").update({payment_method:"BANK_TRANSFER"}).eq("id",o.order_id).eq("guest_access_token_hash",tokenHash).eq("payment_status","pending").is("payment_method",null).select("id");
  if(markError||!marked?.length){const {data:existing}=await supabase.from("orders").select("payment_method").eq("id",o.order_id).maybeSingle();if(existing?.payment_method!=="BANK_TRANSFER")return NextResponse.json({error:"계좌이체 주문을 등록하지 못했습니다."},{status:409});}
 }
 return NextResponse.json({orderId:o.order_id,orderNumber:o.order_number,amount:o.total,orderName:o.order_name,clientKey:process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY});
}
