import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { BUSINESS_INFO, POLICY_EFFECTIVE_DATE } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "Casa di Stefano 개인정보처리방침",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage
    eyebrow="PRIVACY"
    title="개인정보처리방침"
    intro="주문과 계정 서비스를 제공하기 위해 필요한 범위에서 개인정보를 처리하고, 목적이 끝나면 관계 법령에 따라 안전하게 관리합니다."
  >
    <p className="legal-effective">시행일 {POLICY_EFFECTIVE_DATE}</p>

    <LegalSection title="1. 처리하는 개인정보와 목적">
      <div className="legal-table-wrap"><table className="legal-table">
        <thead><tr><th>구분</th><th>주요 항목</th><th>목적</th></tr></thead>
        <tbody>
          <tr><td>회원</td><td>이메일, 소셜 로그인에서 제공되는 이름·프로필 정보</td><td>로그인, 계정 식별, 주문내역 연결</td></tr>
          <tr><td>주문 · 배송</td><td>이름, 휴대전화, 이메일(선택), 우편번호, 주소, 배송 메모</td><td>주문 처리, 배송, 픽업, 고객 문의 대응</td></tr>
          <tr><td>저장 배송지</td><td>수령인, 연락처, 주소, 배송지 이름</td><td>로그인 고객의 다음 주문 편의</td></tr>
          <tr><td>결제</td><td>주문번호, 결제 상태, 결제금액 등 거래 정보</td><td>결제 승인, 취소, 환불, 정산 확인</td></tr>
          <tr><td>리뷰</td><td>작성자명, 평점, 글, 업로드 이미지</td><td>상품 후기 제공 및 관리</td></tr>
          <tr><td>서비스 이용</td><td>접속 기록 등 서비스 운영 과정에서 생성되는 기술 정보</td><td>보안, 장애 대응, 서비스 개선</td></tr>
        </tbody>
      </table></div>
      <p>결제 카드번호와 같은 결제수단의 민감한 정보는 결제사업자가 직접 처리하며 Casa di Stefano 데이터베이스에 저장하지 않습니다.</p>
    </LegalSection>

    <LegalSection title="2. 처리 근거">
      <p>상품 주문, 배송, 결제, 고객 요청 처리 등 계약 체결과 이행에 필요한 정보는 관련 법령이 허용하는 범위에서 처리합니다. 선택 기능이나 별도 동의가 필요한 처리가 추가되는 경우 해당 화면에서 필요한 내용을 안내하고 동의를 받습니다.</p>
    </LegalSection>

    <LegalSection title="3. 보유 및 이용 기간">
      <p>처리 목적이 달성된 개인정보는 지체 없이 파기하는 것을 원칙으로 합니다. 다만 관계 법령에 따라 거래기록을 보존해야 하는 경우에는 해당 기간 동안 별도로 보관합니다.</p>
      <ul>
        <li>표시 · 광고에 관한 기록: 6개월</li>
        <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
        <li>대금결제 및 재화 공급에 관한 기록: 5년</li>
        <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. 외부 서비스와 처리위탁">
      <p>서비스 운영을 위해 다음과 같은 외부 서비스를 사용할 수 있습니다. 실제 정식 오픈 시 계약 상태와 처리 범위를 다시 확인해 최종 고지합니다.</p>
      <div className="legal-table-wrap"><table className="legal-table">
        <thead><tr><th>서비스</th><th>사용 목적</th></tr></thead>
        <tbody>
          <tr><td>Supabase</td><td>회원 인증, 데이터베이스, 이미지 저장</td></tr>
          <tr><td>Vercel</td><td>웹사이트 호스팅 및 서비스 제공</td></tr>
          <tr><td>Toss Payments</td><td>온라인 결제 승인, 취소 및 결제 처리</td></tr>
          <tr><td>카카오/Daum 우편번호 서비스</td><td>배송지 주소 검색</td></tr>
        </tbody>
      </table></div>
    </LegalSection>

    <LegalSection title="5. 개인정보의 파기">
      <p>보유기간이 끝났거나 처리 목적이 달성된 개인정보는 복구하기 어려운 방식으로 삭제합니다. 법령상 보존 의무가 있는 거래기록은 일반 이용 정보와 구분하여 필요한 기간 동안 보관한 뒤 파기합니다.</p>
    </LegalSection>

    <LegalSection title="6. 이용자의 권리">
      <p>이용자는 자신의 개인정보 열람, 정정, 삭제, 처리정지 등을 요청할 수 있습니다. 로그인 고객은 저장 배송지 등 일부 정보를 직접 관리할 수 있으며, 그 밖의 요청은 고객 문의 채널을 통해 접수할 수 있습니다.</p>
    </LegalSection>

    <LegalSection title="7. 안전성 확보">
      <p>인증과 데이터 접근권한을 분리하고, 필요한 데이터에만 접근할 수 있도록 권한을 제한하며, 서비스 제공에 필요한 범위 내에서 보안 조치를 적용합니다.</p>
    </LegalSection>

    <LegalSection title="8. 개인정보 보호 문의">
      <dl className="legal-facts">
        <div><dt>운영자</dt><dd>{BUSINESS_INFO.displayName}</dd></div>
        <div><dt>전화</dt><dd>{BUSINESS_INFO.phone}</dd></div>
      </dl>
      <p className="legal-notice">개인정보 보호책임자 및 전자우편 주소는 사업자등록과 정식 오픈 준비가 완료되는 즉시 실제 정보로 업데이트합니다.</p>
    </LegalSection>

    <LegalSection title="9. 방침 변경">
      <p>본 방침이 변경되는 경우 변경 내용과 시행일을 사이트를 통해 안내합니다.</p>
    </LegalSection>
  </LegalPage>;
}
