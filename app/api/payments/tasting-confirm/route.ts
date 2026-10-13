import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tokenMatches } from "@/lib/order-access";
import { cancelPayment,confirmPayment,getPayment,isConfirmedPayment } from "@/services/payment";
import { validateVariants } from "@/lib/product-contract";
const fail=(status=400,msg="결제를 확인하지 못했습니다.")=>NextResponse.json({error:msg},{status});
export async function POST(request:Request){
 let b:any;try{b=await request.json()}catch{return fail()}
 const paymentKey=typeof b?.paymentKey==="string"?b.paymentKey:"",orderId=typeof b?.orderId==="string"?b.orderId:"",token=typeof b?.accessToken==="string"?b.accessToken:"";
 if(!paymentKey||!orderId||!Number.isInteger(b?.amount))return fail();
 const db=createServiceClient();
 const {data:o}=await db.from("orders").select("id,order_number,total,payment_status,payment_method,payment_key,guest_access_token_hash,order_source,table_label,order_items(id,product_id,menu_item_id,variant_id,weight,quantity,unit_price,selected_option)").eq("id",orderId).maybeSingle();
 if(o?.payment_method==="BANK_TRANSFER")return fail(409);
 if(!o||o.order_source!=="tasting_room"||!tokenMatches(token,o.guest_access_token_hash)||o.total!==b.amount)return fail(403);
 if(o.payment_status==="paid")return o.payment_key===paymentKey?response(db,o.id):fail(409);
 if(["cancelled","refunded"].includes(o.payment_status))return fail(409);
 let fresh=0;
 for(const item of o.order_items){
  if(item.menu_item_id){const {data:m}=await db.from("tasting_menu_items").select("price,active,sold_out,hot_available,iced_available").eq("id",item.menu_item_id).maybeSingle();if(!m?.active||m.sold_out)return fail(409,"품절된 메뉴가 있습니다. 주문을 다시 확인해 주세요.");const opt=item.selected_option;if((opt==="HOT"&&!m.hot_available)||(opt==="ICE"&&!m.iced_available))return fail(409);fresh+=m.price*item.quantity}
  else if(item.product_id){const {data:p}=await db.from("products").select("status,variants,sales_channels").eq("id",item.product_id).maybeSingle();if(p?.status!=="active"||!p.sales_channels?.includes("tasting_room"))return fail(409);let v;try{v=validateVariants(p.variants).find(x=>x.id===item.variant_id&&x.size===item.weight)}catch{return fail(409)}if(!v?.available||v.stock<item.quantity)return fail(409,"원두 재고가 부족합니다.");fresh+=(v.salePrice??v.price)*item.quantity}
 }
 if(fresh!==o.total||fresh!==b.amount)return fail(409,"메뉴 가격이 변경되었습니다. 주문을 다시 확인해 주세요.");
 let payment:any;try{const existing=await getPayment(paymentKey);if(isConfirmedPayment(existing,o.id,o.total))payment=existing}catch{}
 if(!payment){try{payment=await confirmPayment(paymentKey,o.id,o.total)}catch{return fail()}}
 if(!isConfirmedPayment(payment,o.id,o.total))return fail();
 const {data:result,error}=await db.rpc("finalize_tasting_room_order",{p_order_id:o.id,p_payment_key:payment.paymentKey,p_amount:payment.totalAmount,p_method:payment.method??null,p_approved_at:payment.approvedAt??new Date().toISOString()});
 if(error||!["paid","already_paid"].includes(result)){try{await cancelPayment(payment.paymentKey,"재고 부족으로 인한 자동 취소")}catch{return fail(502,"결제 취소 확인이 필요합니다. 직원에게 문의해 주세요.")}return fail(409,"재고가 소진되어 결제가 자동 취소되었습니다.")}
 return response(db,o.id);
}
async function response(db:ReturnType<typeof createServiceClient>,id:string){const {data}=await db.from("orders").select("order_number,total,payment_status,table_label,order_items(product_name,selected_option,quantity,subtotal)").eq("id",id).single();return !data||data.payment_status!=="paid"?fail(503):NextResponse.json({order:data})}
