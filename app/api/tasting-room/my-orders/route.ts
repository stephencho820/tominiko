import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function GET(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({orders:[]},{headers:{"Cache-Control":"no-store"}});
 const {data,error}=await supabase.from("orders").select("id,order_number,order_status,payment_status,payment_method,total,created_at,order_items(product_name,selected_option,quantity,subtotal)").eq("user_id",user.id).eq("order_source","tasting_room").order("created_at",{ascending:false}).limit(50);
 if(error)return NextResponse.json({error:"주문 내역을 불러오지 못했습니다."},{status:503});
 return NextResponse.json({orders:data||[]},{headers:{"Cache-Control":"no-store"}});
}
