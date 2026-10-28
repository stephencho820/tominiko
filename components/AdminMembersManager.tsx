"use client";
import { useEffect, useState } from "react";
type Member = { id: string; email: string; createdAt: string; confirmed: boolean; lastSignIn: string | null; role: "admin" | "customer" };
export function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/admin/members", { cache: "no-store" }).then(async r => { if (!r.ok) throw new Error("회원 목록을 불러오지 못했습니다."); return r.json(); }).then(d => setMembers(d.members)).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function changeRole(member: Member, role: "admin" | "customer") {
    if (role === member.role || busy) return;
    if (!window.confirm(`${member.email} 계정을 ${role === "admin" ? "관리자" : "일반 고객"}로 변경할까요?`)) return;
    setBusy(member.id); setError("");
    try {
      const response = await fetch("/api/admin/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "변경에 실패했습니다.");
      setMembers(current => current.map(m => m.id === member.id ? { ...m, role } : m));
    } catch (e) { setError(e instanceof Error ? e.message : "변경에 실패했습니다."); }
    finally { setBusy(null); }
  }
  return <section className="admin-panel">
    <div className="mb-5 flex flex-wrap gap-5"><span>전체 회원 <strong>{members.length}</strong></span><span>관리자 <strong>{members.filter(m => m.role === "admin").length}</strong></span><span>이메일 미인증 <strong>{members.filter(m => !m.confirmed).length}</strong></span></div>
    {loading && <p>회원 정보를 불러오는 중…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3">이메일</th><th>가입일</th><th>인증</th><th>최근 로그인</th><th>권한</th></tr></thead><tbody>{members.map(m => <tr key={m.id} className="border-b border-[var(--line)]"><td className="py-4">{m.email}</td><td>{new Date(m.createdAt).toLocaleDateString("ko-KR")}</td><td>{m.confirmed ? "완료" : "미인증"}</td><td>{m.lastSignIn ? new Date(m.lastSignIn).toLocaleDateString("ko-KR") : "-"}</td><td><select aria-label={`${m.email} 권한`} value={m.role} disabled={busy !== null} onChange={e => void changeRole(m, e.target.value as "admin" | "customer")} className="border p-2"><option value="customer">고객</option><option value="admin">관리자</option></select></td></tr>)}</tbody></table></div>
    <p className="mt-4 text-xs">관리자 권한은 운영 데이터 접근 권한을 포함합니다. 신뢰할 수 있는 계정에만 부여하세요.</p>
  </section>;
}
