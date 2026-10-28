import { MembersManager } from "@/components/AdminMembersManager";
export default function MembersPage() {
  return <main className="admin-main"><div className="admin-page-heading"><div><p className="eyebrow">ACCOUNT MANAGEMENT</p><h1>회원 관리</h1><p>가입 회원의 이메일 인증 상태와 관리자 권한을 관리합니다.</p></div></div><MembersManager /></main>;
}
