"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { calculateCheckoutTotal, DEFAULT_DELIVERY_SETTINGS, freeShippingProgress, isLocalDeliveryEligible, type DeliveryMethod, type DeliverySettings, type LocalDeliveryZone } from "@/lib/shipping";

declare global { interface Window { daum?: { Postcode: new (options: { oncomplete: (data: DaumResult) => void; width?: string; height?: string }) => { embed: (element: HTMLElement) => void } }; TossPayments?: ((key: string) => { payment: (options: { customerKey: string }) => { requestPayment: (options: Record<string, unknown>) => Promise<void> } }) & { ANONYMOUS: string } } }
type DaumResult = { zonecode: string; roadAddress: string; jibunAddress: string; buildingName: string; bname: string };
type Address = { id?: string; label: string; recipient_name: string; phone: string; zonecode: string; road_address: string; jibun_address: string; detail_address: string; building_name: string; bname?: string; is_default: boolean };
type Bootstrap = { settings: DeliverySettings; zones: LocalDeliveryZone[]; user: { name?: string; phone?: string; email?: string } | null; addresses: Address[] };
const money = (value: number) => `₩${value.toLocaleString("ko-KR")}`;
const memoOptions = ["문 앞에 놓아주세요", "배송 전에 문자 주세요", "배송 전에 전화 주세요", "경비실/관리실에 맡겨주세요", "직접 입력"];
const initial = { customerName: "", phone: "", email: "", zonecode: "", roadAddress: "", jibunAddress: "", detailAddress: "", buildingName: "", bname: "", memoType: memoOptions[0], memoText: "", label: "집" };

function addressFields(address: Address) {
  // Saved addresses predate bname storage; recover the exact Korean district token
  // from their jibun address and send it to the same DB eligibility function.
  const bname = address.bname ?? address.jibun_address?.trim().split(/\s+/).find((part) => /[읍면동가]$/.test(part)) ?? "";
  return { zonecode: address.zonecode, roadAddress: address.road_address || "", jibunAddress: address.jibun_address || "", detailAddress: address.detail_address, buildingName: address.building_name || "", bname, label: address.label };
}

function newToken() { return `${crypto.randomUUID()}${crypto.randomUUID()}`; }
async function loadToss() {
  if (window.TossPayments) return;
  await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://js.tosspayments.com/v2/standard"; script.onload = () => resolve(); script.onerror = reject; document.head.appendChild(script); });
}

export default function PaymentCheckout() {
  const { items, total: subtotal, cartReady, refreshError, refreshCart } = useCart();
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const [bootstrap, setBootstrap] = useState<Bootstrap>({ settings: DEFAULT_DELIVERY_SETTINGS, zones: [], user: null, addresses: [] });
  const [form, setForm] = useState(initial); const [method, setMethod] = useState<DeliveryMethod>("shipping");
  const [errors, setErrors] = useState<Record<string, string>>({}); const [notice, setNotice] = useState("");
  const [postcodeReady, setPostcodeReady] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false); const [showNewAddress, setShowNewAddress] = useState(true);
  const [saveAddress, setSaveAddress] = useState(false); const [defaultAddress, setDefaultAddress] = useState(false); const [submitting, setSubmitting] = useState(false);
  const postcodeRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const totals = calculateCheckoutTotal(subtotal, 0, method, bootstrap.settings);
  const progress = freeShippingProgress(totals.productSubtotal, bootstrap.settings);
  const localServiceAvailable = bootstrap.settings.localDeliveryEnabled && bootstrap.zones.length > 0;
  const localEligible = isLocalDeliveryEligible(form, bootstrap.zones, localServiceAvailable);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout").then(async (response) => {
      if (!response.ok) throw new Error("배송 설정을 확인하지 못했습니다. 화면을 새로고침해 주세요.");
      return response.json() as Promise<Bootstrap>;
    }).then((data) => {
      if (cancelled) return;
      setBootstrap(data);
      const selected = data.addresses.find((address) => address.is_default) ?? data.addresses[0];
      setForm((current) => ({ ...current, customerName: selected?.recipient_name || data.user?.name || "", phone: selected?.phone || data.user?.phone || "", email: data.user?.email ?? "", ...(selected ? addressFields(selected) : {}) }));
      setShowNewAddress(!selected);
      setBootstrapReady(true);
    }).catch((error) => { if (!cancelled) setBootstrapError(error.message); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (addressOpen && postcodeRef.current && window.daum) postcodeRef.current.innerHTML = "", new window.daum.Postcode({ oncomplete: chooseDaum }).embed(postcodeRef.current); }, [addressOpen, postcodeReady]);
  useEffect(() => { if (method === "local_delivery" && !localEligible) { setMethod("shipping"); setNotice("변경된 주소는 CASA LOCAL DELIVERY 가능 지역이 아니어서 택배 배송으로 변경되었습니다."); } }, [localEligible, form.zonecode, method]);

  function chooseDaum(data: DaumResult) { setForm((old) => ({ ...old, zonecode: data.zonecode, roadAddress: data.roadAddress, jibunAddress: data.jibunAddress, buildingName: data.buildingName, bname: data.bname, detailAddress: "" })); setAddressOpen(false); setErrors((old) => ({ ...old, address: "", detailAddress: "" })); setTimeout(() => document.getElementById("detailAddress")?.focus(), 20); }
  function selectAddress(address: Address) { setForm((old) => ({ ...old, customerName: address.recipient_name, phone: address.phone, ...addressFields(address) })); setShowNewAddress(false); setSaveAddress(false); }
  function validate() { const next: Record<string,string> = {}; if (!form.customerName.trim()) next.customerName = "이름을 입력해 주세요."; if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(form.phone)) next.phone = "한국 휴대전화 번호를 확인해 주세요."; if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "이메일 형식을 확인해 주세요."; if (method !== "pickup") { if (!form.zonecode || !form.roadAddress) next.address = "주소 찾기로 배송지를 선택해 주세요."; if (!form.detailAddress.trim()) next.detailAddress = "상세주소를 입력해 주세요."; } if (method === "local_delivery" && !localEligible) next.method = "현재 주소는 로컬배송 지역이 아닙니다."; setErrors(next); return !Object.keys(next).length; }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!validate() || submittingRef.current || !cartReady || !bootstrapReady) return; submittingRef.current = true; setSubmitting(true); setErrors({});
    try {
      const latestItems = await refreshCart();
      const cartSnapshot = (lines: typeof items) => JSON.stringify(lines.map((item) => [item.product.id, item.variantId, item.weight, item.grind, item.quantity, item.unitPrice]));
      if (!latestItems.length || cartSnapshot(latestItems) !== cartSnapshot(items)) throw new Error("상품 가격 또는 재고가 변경되었습니다. 장바구니를 확인한 뒤 다시 결제해 주세요.");
      if (bootstrap.user && saveAddress && method !== "pickup") { const saved = await fetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, recipientName: form.customerName, isDefault: defaultAddress }) }); if (!saved.ok) throw new Error((await saved.json()).error); setSaveAddress(false); }
      const orderForm = { ...form, memoType: method === "pickup" ? "" : form.memoType, memoText: method === "pickup" ? "" : form.memoText };
      const fingerprint = JSON.stringify({ form: orderForm, method, items: cartSnapshot(latestItems), settings: bootstrap.settings }); let key = sessionStorage.getItem("tominiko-checkout-reference"), token = sessionStorage.getItem("tominiko-order-access-token");
      if (!key || !token || sessionStorage.getItem("tominiko-checkout-cart") !== fingerprint) { key = crypto.randomUUID(); token = newToken(); sessionStorage.setItem("tominiko-checkout-reference", key); sessionStorage.setItem("tominiko-order-access-token", token); sessionStorage.setItem("tominiko-checkout-cart", fingerprint); }
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...orderForm, fulfillmentType: method, items: latestItems, idempotencyKey: key, accessToken: token }) }); const order = await response.json(); if (!response.ok) throw new Error(order.error);
      sessionStorage.setItem("tominiko-payment-order-id", order.orderId); await loadToss(); if (!window.TossPayments) throw new Error("결제 모듈을 시작하지 못했습니다.");
      await window.TossPayments(order.clientKey).payment({ customerKey: window.TossPayments.ANONYMOUS }).requestPayment({ method: "CARD", amount: { currency: "KRW", value: order.amount }, orderId: order.orderId, orderName: order.orderName, successUrl: `${location.origin}/checkout/success`, failUrl: `${location.origin}/checkout/fail`, customerEmail: form.email || undefined, customerName: form.customerName, customerMobilePhone: form.phone.replace(/\D/g, ""), card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false } });
    } catch (error) { setErrors({ submit: error instanceof Error ? error.message : "결제를 시작하지 못했습니다." }); setSubmitting(false); submittingRef.current = false; }
  }
  const field = (key: "customerName"|"phone"|"email", label: string, type="text") => <label className={`checkout-field ${errors[key] ? "has-error" : ""}`}><span>{label}{key === "email" && <small>OPTIONAL</small>}</span><input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />{errors[key] && <em>{errors[key]}</em>}</label>;
  if (!items.length) return <main className="purchase-page"><section className="empty-bag"><p>장바구니가 비어 있습니다.</p><Link href="/shop" className="button-primary purchase-button">커피 둘러보기 →</Link></section></main>;
  return <main className="purchase-page checkout-page"><Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" onReady={() => setPostcodeReady(true)} onError={() => { setAddressOpen(false); setErrors((old) => ({ ...old, address: "주소 검색을 불러오지 못했습니다. 다시 시도해 주세요." })); }} />
    {(refreshError || bootstrapError) && <p role="alert" className="submit-error">{refreshError || bootstrapError}</p>}
    <header className="purchase-heading"><div><p className="section-label">SECURE CHECKOUT</p><h1>Checkout</h1></div><Link href="/cart" className="edit-bag">장바구니 수정</Link></header>
    <form onSubmit={submit} noValidate className="checkout-layout"><div className="checkout-form">
      <section className="checkout-section"><div className="checkout-section-title"><span>01</span><div><p className="section-label">CUSTOMER</p><h2>주문자 정보</h2></div></div><div className="field-grid">{field("customerName","이름")}{field("phone","연락처","tel")}<div className="field-wide">{field("email","이메일","email")}</div></div></section>
      <section className="checkout-section"><div className="checkout-section-title"><span>02</span><div><p className="section-label">DELIVERY</p><h2>배송 정보</h2></div></div>
        {method !== "pickup" && <div className="address-block"><div className="delivery-subhead"><span>배송지</span><button type="button" className="outline-small" onClick={() => { setShowNewAddress(true); setForm((old) => ({ ...old, zonecode: "", roadAddress: "", jibunAddress: "", detailAddress: "", buildingName: "", bname: "" })); }}>+ 새 배송지</button></div>
          {bootstrap.user && bootstrap.addresses.length > 0 && !showNewAddress && <div className="saved-addresses">{bootstrap.addresses.map((a) => <button type="button" key={a.id} className={form.zonecode === a.zonecode && form.detailAddress === a.detail_address ? "selected" : ""} onClick={() => selectAddress(a)}><i /><span><strong>{a.label}{a.is_default && <small> 기본</small>}</strong><span>{a.road_address} {a.detail_address}</span><span>{a.recipient_name} · {a.phone}</span></span></button>)}</div>}
          {(showNewAddress || !bootstrap.addresses.length) && <div className="new-address"><button type="button" className="address-search" onClick={() => setAddressOpen(true)}>주소 찾기</button>{form.zonecode && <div className="found-address"><span>{form.zonecode}</span><strong>{form.roadAddress}</strong>{form.jibunAddress && <small>지번 {form.jibunAddress}</small>}</div>} {errors.address && <p className="field-error">{errors.address}</p>}<label className={`checkout-field ${errors.detailAddress ? "has-error" : ""}`}><span>상세주소</span><input id="detailAddress" value={form.detailAddress} onChange={(e) => setForm({ ...form, detailAddress: e.target.value })} placeholder="101동 1203호" />{errors.detailAddress && <em>{errors.detailAddress}</em>}</label>{bootstrap.user && <div className="save-address"><label><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> 배송지 저장</label>{saveAddress && <><input aria-label="배송지 이름" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="집" /><label><input type="checkbox" checked={defaultAddress} onChange={(e) => setDefaultAddress(e.target.checked)} /> 기본 배송지로 설정</label></>}</div>}</div>}
        </div>}
        <div className="delivery-methods"><p className="delivery-subhead">받는 방법 <small>DELIVERY METHOD</small></p>{([{ id:"shipping", title:"택배 배송", copy:`전국 배송 · ${money(bootstrap.settings.freeShippingThreshold)} 이상 무료배송` }, ...(localServiceAvailable ? [{ id:"local_delivery" as const, title:"CASA LOCAL DELIVERY", copy: localEligible ? "광교 이웃 무료배송" : form.zonecode ? "현재 주소는 로컬배송 지역이 아닙니다." : "주소 검색 후 이용 가능 여부를 확인합니다." }] : []), { id:"pickup", title:"매장 픽업", copy:"Casa di Stefano에서 직접 수령 · 무료" }] as const).map((option) => <button type="button" key={option.id} disabled={option.id === "local_delivery" && !localEligible} className={`${method === option.id ? "selected" : ""} ${option.id === "local_delivery" ? "local-option" : ""}`} onClick={() => { setMethod(option.id); setNotice(""); }}><i /><span><strong>{option.title}{option.id === "local_delivery" && <small>LOCAL SERVICE</small>}</strong><span>{option.copy}</span></span></button>)}</div>{notice && <p className="method-notice">{notice}</p>}{errors.method && <p className="field-error">{errors.method}</p>}
        {method !== "pickup" && <div className="delivery-memo"><label className="checkout-field"><span>{method === "local_delivery" ? "로컬배송 요청사항" : "배송 메모"}</span><select value={form.memoType} onChange={(e) => setForm({ ...form, memoType: e.target.value })}>{memoOptions.map((option) => <option key={option}>{option}</option>)}</select></label>{form.memoType === "직접 입력" && <label className="checkout-field"><span>직접 입력</span><textarea maxLength={500} value={form.memoText} onChange={(e) => setForm({ ...form, memoText: e.target.value })} /></label>}</div>}
      </section>{errors.submit && <p role="alert" className="submit-error">{errors.submit}</p>}</div>
      <aside className="checkout-summary"><p className="section-label">ORDER SUMMARY</p><div className="summary-items">{items.map((item, i) => <div className="summary-item" key={`${item.product.id}-${i}`}><div><strong>{item.product.name}</strong><span>{item.weight} · {item.grind} × {item.quantity}</span></div><span>{money(item.unitPrice * item.quantity)}</span></div>)}</div><dl className="summary-costs"><div><dt>상품 금액</dt><dd>{money(totals.productSubtotal)}</dd></div><div><dt>배송비</dt><dd>{totals.shippingFee ? money(totals.shippingFee) : "무료"}</dd></div><div className="summary-total"><dt>결제 금액</dt><dd>{money(totals.finalAmount)}</dd></div></dl>{method === "shipping" && <div className="shipping-progress"><div><span>{progress.qualified ? "✓ 무료배송 혜택이 적용되었습니다." : `${money(progress.remaining)} 더 담으면 무료배송`}</span><small>{Math.round(progress.percent)}%</small></div><i><span style={{ width: `${progress.percent}%` }} /></i></div>}<button disabled={submitting || !cartReady || !bootstrapReady} className="button-primary purchase-button">{submitting ? "결제 준비 중…" : `${money(totals.finalAmount)} 결제하기`}</button><p className="checkout-note">최종 금액은 서버에서 최신 상품 가격과 배송 정책으로 다시 확인합니다.</p></aside>
    </form>{addressOpen && <div className="postcode-modal" role="dialog" aria-modal="true" aria-label="주소 찾기"><div><header><strong>주소 찾기</strong><button type="button" onClick={() => setAddressOpen(false)}>닫기</button></header><div ref={postcodeRef} className="postcode-frame" /></div></div>}
  </main>;
}
