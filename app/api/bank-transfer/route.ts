import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tokenMatches } from "@/lib/order-access";
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
export async function POST(request:Request){
 let input:{orderId?:string;accessToken?:string};
 try{input=await request.json()}catch{return NextResponse.json({error:"잘못된 요청입니다."},{status:400})}
 if(!input?.orderId||!uuid.test(input.orderId)||!input.accessToken)return NextResponse.json({error:"주문 확인 정보가 없습니다."},{status:400});
 const db=createServiceClient();
 const {data:o}=await db.from("orders").select("id,order_number,total,payment_status,payment_method,guest_access_token_hash").eq("id",input.orderId).maybeSingle();
 if(!o||!tokenMatches(input.accessToken,o.guest_access_token_hash)||o.payment_method!=="BANK_TRANSFER"||o.payment_status!=="pending")return NextResponse.json({error:"입금 대기 주문을 찾지 못했습니다."},{status:403});
 const {data:bank}=await db.from("manual_transfer_settings").select("bank_name,account_number,account_holder").eq("id",true).maybeSingle();
 if(!bank)return NextResponse.json({error:"입금 계좌가 아직 설정되지 않았습니다."},{status:503});
 return NextResponse.json({orderNumber:o.order_number,amount:o.total,bankName:bank.bank_name,accountNumber:bank.account_number,accountHolder:bank.account_holder});
}
