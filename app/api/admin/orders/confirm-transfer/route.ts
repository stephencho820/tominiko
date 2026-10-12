import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
export async function POST(request:Request){
 const db=await getAdminClient();if(!db)return NextResponse.json({error:"권한이 없습니다."},{status:403});
 let body:{id?:string};try{body=await request.json()}catch{return NextResponse.json({error:"잘못된 요청입니다."},{status:400})}
 if(!body?.id||!/^[0-9a-f-]{36}$/i.test(body.id))return NextResponse.json({error:"주문 번호가 올바르지 않습니다."},{status:400});
 const {data,error}=await db.rpc("confirm_manual_transfer",{p_order_id:body.id});
 if(error)return NextResponse.json({error:"입금 확인 처리에 실패했습니다."},{status:500});
 if(data!=="paid"&&data!=="already_paid")return NextResponse.json({error:data==="out_of_stock"?"재고가 부족합니다. 고객에게 연락한 뒤 처리해 주세요.":"주문 상태를 확인해 주세요."},{status:409});
 return NextResponse.json({ok:true});
}
