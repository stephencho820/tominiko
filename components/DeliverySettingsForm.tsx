"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isUUID, validateDeliverySettings, validateDeliveryZone } from "@/lib/admin-delivery-validation";
const weekdays = [[1,"월"],[2,"화"],[3,"수"],[4,"목"],[5,"금"],[6,"토"],[0,"일"]] as const;
type Props = { settings: { free_shipping_threshold:number; standard_shipping_fee:number; local_delivery_enabled:boolean; local_delivery_days:number[]; local_delivery_message:string }; zones: {id:string;name:string;zone_type:string;zone_value:string;enabled:boolean}[] };
export default function DeliverySettingsForm({ settings, zones }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ ...settings, free_shipping_threshold: String(settings.free_shipping_threshold), standard_shipping_fee: String(settings.standard_shipping_fee) });
  const [zone, setZone] = useState({ name: "", zoneType: "district", zoneValue: "" });
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [pending, setPending] = useState("");
  const pendingRef = useRef(false);
  async function send(body: Record<string, unknown>, action: string) {
    if (pendingRef.current) return false;
    setFeedback(null);
    const error = body.action === "settings" ? validateDeliverySettings(body).error
      : body.action === "zone" ? validateDeliveryZone(body).error
      : !isUUID(body.id) ? "올바른 지역 ID를 확인해 주세요." : undefined;
    if (error) { setFeedback({ error: true, message: error }); return false; }
    pendingRef.current = true; setPending(action);
    try {
      const response = await fetch("/api/admin/delivery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) { setFeedback({ error: true, message: data.error ?? "저장하지 못했습니다." }); return false; }
      setFeedback({ error: false, message: body.action === "delete" ? "배송 지역이 삭제되었습니다." : body.action === "zone" ? "배송 지역이 추가되었습니다." : "저장되었습니다." });
      router.refresh();
      return true;
    } catch { setFeedback({ error: true, message: "네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요." }); return false; }
    finally { pendingRef.current = false; setPending(""); }
  }
  function saveSettings() {
    const amount = (value: string) => value.trim() ? Number(value) : NaN;
    return send({ action: "settings", freeShippingThreshold: amount(form.free_shipping_threshold), standardShippingFee: amount(form.standard_shipping_fee), localDeliveryEnabled: form.local_delivery_enabled, localDeliveryDays: form.local_delivery_days, localDeliveryMessage: form.local_delivery_message }, "settings");
  }
  const busy = Boolean(pending);
  return <div className="delivery-admin">
    {feedback && <p className="admin-feedback" role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
    <section className="admin-panel"><fieldset disabled={busy} className="border-0 p-0"><p className="eyebrow">STANDARD SHIPPING</p>
      <div className="admin-form-grid">
        <label>무료배송 기준<input type="number" min="0" step="1" value={form.free_shipping_threshold} onChange={e => setForm({ ...form, free_shipping_threshold: e.target.value })} /></label>
        <label>기본 배송비<input type="number" min="0" step="1" value={form.standard_shipping_fee} onChange={e => setForm({ ...form, standard_shipping_fee: e.target.value })} /></label>
      </div><p className="eyebrow admin-form-heading">CASA LOCAL DELIVERY</p>
      <label className="admin-check"><input type="checkbox" checked={form.local_delivery_enabled} onChange={e => setForm({ ...form, local_delivery_enabled: e.target.checked })} /> Local Delivery 사용</label>
      <label>안내 문구<textarea maxLength={500} value={form.local_delivery_message} onChange={e => setForm({ ...form, local_delivery_message: e.target.value })} /></label>
      <div className="admin-days"><span>배송 가능 요일</span>{weekdays.map(([value,label]) => <label key={value}><input type="checkbox" checked={form.local_delivery_days.includes(value)} onChange={e => setForm({ ...form, local_delivery_days: e.target.checked ? [...new Set([...form.local_delivery_days, value])] : form.local_delivery_days.filter(d => d !== value) })} />{label}</label>)}</div>
      <button type="button" className="admin-primary" onClick={() => void saveSettings()}>{pending === "settings" ? "저장 중…" : "설정 저장"}</button>
    </fieldset></section>
    <section className="admin-panel"><fieldset disabled={busy} className="border-0 p-0"><p className="eyebrow">LOCAL DELIVERY ZONES</p>
      <p className="admin-muted">행정동이나 우편번호로 구분하기 어려운 주소는 주소 키워드를 추가하세요. 예: 웰빙타운로 또는 웰빙타운로 20</p>
      <div className="zone-add"><input aria-label="지역명" placeholder="지역명" value={zone.name} onChange={e => setZone({ ...zone, name: e.target.value })} />
        <select aria-label="지역 타입" value={zone.zoneType} onChange={e => setZone({ ...zone, zoneType: e.target.value })}><option value="district">행정동/법정동</option><option value="address_keyword">주소 키워드</option><option value="postal_prefix">우편번호 prefix</option><option value="postal_range">우편번호 range</option></select>
        <input aria-label="지역 값" placeholder={zone.zoneType === "address_keyword" ? "예: 웰빙타운로 20" : "값 (예: 이의동 / 16500-16599)"} value={zone.zoneValue} onChange={e => setZone({ ...zone, zoneValue: e.target.value })} />
        <button type="button" className="admin-secondary" onClick={async () => { if (await send({ action: "zone", ...zone }, "zone")) setZone({ name: "", zoneType: "district", zoneValue: "" }); }}>{pending === "zone" ? "추가 중…" : "+ 지역 추가"}</button>
      </div><div className="zone-table"><div className="zone-row zone-head"><span>지역명</span><span>타입</span><span>값</span><span>상태</span><span /></div>
        {zones.map(z => <div className="zone-row" key={z.id}><span>{z.name}</span><span>{z.zone_type === "address_keyword" ? "주소 키워드" : z.zone_type}</span><span>{z.zone_value}</span>
          <button type="button" onClick={() => void send({ action: "toggle", id: z.id, enabled: !z.enabled }, `toggle:${z.id}`)}>{pending === `toggle:${z.id}` ? "변경 중…" : z.enabled ? "활성" : "비활성"}</button>
          <button type="button" onClick={() => { if (!pendingRef.current && confirm(`“${z.name}” 배송 지역을 삭제하시겠습니까?`)) void send({ action: "delete", id: z.id }, `delete:${z.id}`); }}>{pending === `delete:${z.id}` ? "삭제 중…" : "삭제"}</button>
        </div>)}{!zones.length && <p className="admin-empty">등록된 배송 지역이 없습니다.</p>}
      </div></fieldset></section>
  </div>;
}
