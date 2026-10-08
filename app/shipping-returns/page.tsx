import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/shipping";
import { BUSINESS_INFO, POLICY_EFFECTIVE_DATE } from "@/lib/site";

const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export const metadata: Metadata = {
  title: "배송 · 교환 · 환불",
  description: "Casa di Stefano 배송, 교환, 청약철회 및 환불 안내",
  alternates: { canonical: "/shipping-returns" },
};

export default function ShippingReturnsPage() {
  return <LegalPage
    eyebrow="DELIVERY & RETURNS"
    title="배송 · 교환 · 환불"
    intro="신선한 커피를 안전하게 보내고, 문제가 있을 때 빠르게 해결하기 위한 기준입니다."
  >
    <p className="legal-effective">시행일 {POLICY_EFFECTIVE_DATE}</p>

    <LegalSection title="배송비">
      <ul>
        <li>택배: 주문금액 {money(DEFAULT_DELIVERY_SETTINGS.freeShippingThreshold)} 이상 무료배송</li>
        <li>{money(DEFAULT_DELIVERY_SETTINGS.freeShippingThreshold)} 미만: 배송비 {money(DEFAULT_DELIVERY_SETTINGS.standardShippingFee)}</li>
        <li>매장 픽업: 무료</li>
        <li>CASA LOCAL DELIVERY: 결제 화면에서 대상 주소로 확인되는 경우 무료</li>
      </ul>
      <p>실제 결제 시점에는 Admin에 설정된 최신 배송 정책이 우선 적용되며, 주문 요약에서 최종 배송비를 확인할 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="광교 · 서광교 로컬배송">
      <p>광교·서광교 일부 주소는 Casa di Stefano가 직접 배송합니다. 우편번호, 동 또는 도로명 기준으로 결제 화면에서 가능 여부를 자동 확인하며, 대상이 아닌 주소에는 로컬배송 선택지가 제공되지 않습니다.</p>
    </LegalSection>

    <LegalSection title="발송과 픽업">
      <p>주문은 결제 승인과 재고 확인 후 준비합니다. 로스팅 및 발송 일정이 상품 또는 주문 화면에 별도로 표시된 경우 그 안내를 따릅니다. 매장 픽업 주문은 준비 완료 안내 후 {BUSINESS_INFO.address}에서 수령할 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="단순 변심 청약철회">
      <p>관계 법령에 따라 상품을 공급받은 날부터 7일 이내에 청약철회를 요청할 수 있습니다. 단순 변심에 따른 반품 배송비는 고객이 부담할 수 있습니다.</p>
      <p>상품을 개봉·소비·훼손하여 가치가 감소했거나, 고객 요청에 따라 원두를 분쇄하는 등 개별 주문에 맞춰 가공이 진행되어 재판매가 현저히 곤란한 경우에는 관계 법령이 허용하는 범위에서 청약철회가 제한될 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="상품 하자 · 오배송">
      <p>주문한 상품과 다른 상품이 도착했거나 상품에 하자가 있는 경우 수령 후 가능한 한 빨리 {BUSINESS_INFO.phone}으로 알려주세요. 확인 후 교환, 재배송 또는 환불 절차를 안내하며 판매자 책임이 확인된 경우 필요한 배송비는 판매자가 부담합니다.</p>
    </LegalSection>

    <LegalSection title="환불">
      <p>환불이 승인되면 원 결제수단으로 취소 또는 환불합니다. 카드사나 결제사업자의 처리 일정에 따라 실제 환불 반영 시점에는 차이가 있을 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="취소 요청">
      <p>결제 후 로스팅, 분쇄, 포장 또는 배송 준비가 시작되기 전이라면 주문번호와 함께 문의해 주세요. 이미 주문별 가공이나 발송이 시작된 경우에는 상품 상태와 관계 법령에 따라 취소 또는 반품 가능 여부를 안내합니다.</p>
    </LegalSection>

    <LegalSection title="문의">
      <p>배송, 교환, 환불 문의: {BUSINESS_INFO.phone}</p>
    </LegalSection>
  </LegalPage>;
}
