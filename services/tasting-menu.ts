import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export type TastingMenuItem = {
  id:string; name:string; description:string|null; category:"brewed"|"espresso"|"non-coffee"|"sweet";
  price:number; active:boolean; hot_available:boolean; iced_available:boolean; sold_out:boolean; display_order:number;
};

export async function getTastingMenuItems(): Promise<TastingMenuItem[]> {
  if (!hasSupabaseEnv) return [];
  try {
    const supabase=await createClient();
    const {data,error}=await supabase.from("tasting_menu_items").select("id,name,description,category,price,active,hot_available,iced_available,sold_out,display_order").eq("active",true).order("display_order");
    return error ? [] : (data??[]) as TastingMenuItem[];
  } catch { return []; }
}
