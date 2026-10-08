import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { BUSINESS_INFO, POLICY_EFFECTIVE_DATE } from "@/lib/site";

export const metadata: Metadata = {
  title: "이용약관",
  description: "Casa di Stefano 온라인 스토어 이용약관",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalPage
    eyebrow="STORE POLICY"
    title="이용약관"
    intro="Casa di Stefano 온라인 스토어의 주문, 결제, 배송과 서비스 이용에 관한 기본 기준입니다."
  >
    <p className="legal-effective">시행일 {POLICY_EFFECTIVE_DATE}</p>

    <LegalSection title="1. 목적과 적용">
      <p>본 약관은 Casa di Stefano가 운영하는 온라인 스토어에서 제공하는 상품 구매, 회원 기능, 리뷰 및 관련 서비스의 이용 조건을 정합니다. 관계 법령에서 별도로 정한 사항이 있는 경우 해당 법령이 우선합니다.</p>
    </LegalSection>

    <LegalSection title="2. 운영자 정보">
      <dl className="legal-facts">
        <div><dt>브랜드</dt><dd>{BUSINESS_INFO.displayName} · {BUSINESS_INFO.productBrand}</dd></div>
        <div><dt>사업장</dt><dd>{BUSINESS_INFO.address}</dd></div>
        <div><dt>연락처</dt><dd>{BUSINESS_INFO.phone}</dd></div>
      </dl>
      <p className="legal-notice">현재 프리오픈 준비 단계입니다. 대표자명, 사업자등록번호, 통신판매업 신고번호, 전자우편 주소는 정식 판매 개시 전에 실제 등록 정보로 업데이트합니다.</p>
    </LegalSection>

    <LegalSection title="3. 상품 정보와 주문">
      <p>상품명, 중량, 가격, 로스팅 정보, 분쇄 옵션, 재고 등 구매에 필요한 내용은 각 상품 페이지와 결제 화면에 표시합니다. 재고 또는 가격이 결제 직전에 변경된 경우 서버에서 다시 확인하고, 주문 진행을 중단해 변경 내용을 안내할 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="4. 계약 성립과 결제">
      <p>고객이 주문 내용을 확인하고 결제를 완료한 뒤 결제가 정상 승인되면 구매계약이 성립합니다. 온라인 카드 결제는 Toss Payments를 통해 처리할 예정이며, 카드번호 등 결제수단의 민감한 정보는 Casa di Stefano가 직접 저장하지 않습니다.</p>
    </LegalSection>

    <LegalSection title="5. 배송과 수령">
      <p>택배, Casa Local Delivery, 매장 픽업 중 결제 화면에 제공되는 방법을 선택할 수 있습니다. 배송비, 무료배송 기준, 로컬배송 가능 지역 등은 결제 시점의 화면과 <a href="/shipping-returns">배송 · 교환 · 환불 정책</a>을 기준으로 합니다.</p>
    </LegalSection>

    <LegalSection title="6. 청약철회 · 교환 · 환불">
      <p>청약철회, 교환, 환불은 전자상거래 등에서의 소비자보호에 관한 법률 등 관계 법령과 본 스토어의 배송 · 교환 · 환불 정책에 따릅니다. 상품 하자나 오배송이 확인된 경우 판매자가 필요한 비용을 부담합니다.</p>
      <p>원두를 고객의 요청에 따라 분쇄하는 등 주문별 가공이 시작된 상품은 재판매가 현저히 곤란해지는 경우 관계 법령이 허용하는 범위에서 단순 변심에 따른 청약철회가 제한될 수 있으며, 결제 전에 관련 내용을 확인할 수 있도록 안내합니다.</p>
    </LegalSection>

    <LegalSection title="7. 회원 계정">
      <p>회원은 이메일 또는 제공되는 소셜 로그인 방식으로 계정을 이용할 수 있습니다. 계정 정보는 본인이 관리해야 하며, 타인의 계정을 무단으로 이용해서는 안 됩니다. 비회원도 사이트에서 허용하는 범위 내에서 주문할 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="8. 리뷰와 사용자 콘텐츠">
      <p>리뷰에는 실제 경험에 기반한 내용을 작성해 주세요. 타인의 권리를 침해하거나 불법·허위·광고성 콘텐츠가 확인되는 경우 노출을 제한하거나 삭제할 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="9. 개인정보">
      <p>회원, 주문, 배송, 리뷰 과정에서 처리되는 개인정보에 관한 내용은 <a href="/privacy">개인정보처리방침</a>에서 확인할 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="10. 문의와 분쟁">
      <p>주문 또는 상품 관련 문의는 {BUSINESS_INFO.phone}으로 접수할 수 있습니다. 분쟁이 발생한 경우 당사자 간 협의를 우선하며, 해결되지 않는 경우 관련 소비자분쟁조정 절차와 관계 법령을 따릅니다.</p>
    </LegalSection>
  </LegalPage>;
}
