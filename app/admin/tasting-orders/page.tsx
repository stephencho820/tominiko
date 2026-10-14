import {createClient} from "@/lib/supabase/server";
import {TastingLiveOrders} from "@/components/TastingLiveOrders";
export const dynamic="force-dynamic";
export default async function TastingRoomOrders(){
 const db=await createClient();
 const {data}=await db.from("orders").select("id,order_number,created_at,table_label,total,payment_status,payment_method,order_status,delivery_method,order_items(id,product_name,selected_option,weight,quantity)").eq("order_source","tasting_room").order("created_at",{ascending:false}).limit(100);
 return <TastingLiveOrders initial={data??[]}/>;
}
