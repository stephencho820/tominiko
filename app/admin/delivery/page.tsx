import DeliverySettingsForm from "@/components/DeliverySettingsForm";
import { createClient } from "@/lib/supabase/server";
import { runSupabaseQuery } from "@/lib/supabase/query";

export default async function DeliveryAdminPage() {
  let content;
  try {
    const supabase = await createClient();
    const [settingsResult, zonesResult] = await Promise.all([
      runSupabaseQuery(async (signal) => await supabase.from("delivery_settings").select("*").eq("id", true).abortSignal(signal).single()),
      runSupabaseQuery(async (signal) => await supabase.from("local_delivery_zones").select("*").order("created_at").abortSignal(signal)),
    ]);
    content = settingsResult.error || zonesResult.error || !settingsResult.data
      ? <p role="alert">배송 설정을 불러오지 못했습니다.</p>
      : <DeliverySettingsForm settings={settingsResult.data} zones={zonesResult.data ?? []} />;
  } catch { content = <p role="alert">배송 설정을 불러오지 못했습니다.</p>; }
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">STORE OPERATIONS</p><h1>Delivery settings</h1><p>택배와 CASA LOCAL DELIVERY 정책을 관리합니다.</p></div></div>{content}</main>;
}
