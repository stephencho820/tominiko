import {NextResponse} from "next/server";
import {getAdminClient} from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function GET(){
 const db=await getAdminClient();
 if(!db)return NextResponse.json({error:"Forbidden"},{status:403});
 const {data,error}=await db.from("orders").select("id,order_number,created_at,table_label,total,payment_status,payment_method,order_status,delivery_method,order_items(id,product_name,selected_option,weight,quantity)").eq("order_source","tasting_room").order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:"주문을 불러오지 못했습니다."},{status:503});
 return NextResponse.json({orders:data||[]},{headers:{"Cache-Control":"no-store"}});
}
