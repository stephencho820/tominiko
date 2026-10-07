import Link from "next/link";

type Props = { searchParams: Promise<{ reason?: string }> };

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const cancelled = reason === "access_denied";

  return <main className="auth-error-page">
    <p className="section-label">CASA DI STEFANO</p>
    <h1>{cancelled ? "로그인이 취소되었습니다." : "로그인을 완료하지 못했습니다."}</h1>
    <p>{cancelled
      ? "Google 또는 Kakao 로그인 창에서 취소되었습니다. 원하실 때 다시 시도해 주세요."
      : "로그인 연결 과정에서 문제가 발생했습니다. 다시 시도해도 계속되면 로그인 설정을 확인해 주세요."}</p>
    <div>
      <Link href="/login">다시 로그인하기 →</Link>
      <Link href="/shop">로그인 없이 쇼핑하기 →</Link>
    </div>
  </main>;
}
