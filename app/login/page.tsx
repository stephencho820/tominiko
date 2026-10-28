"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export default function Login() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const requestedNext = searchParams.get("next");
	const safeNext = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null;
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [oauthProvider, setOauthProvider] = useState<"google" | null>(null);
	const [needsConfirmation, setNeedsConfirmation] = useState(false);
	const [resending, setResending] = useState(false);
	const [socialProviders, setSocialProviders] = useState({ google: false, loaded: false });

	useEffect(() => {
		let cancelled = false;
		fetch("/api/auth/providers", { cache: "no-store" })
			.then((response) => response.json())
			.then((data: { google?: boolean }) => {
				if (!cancelled) setSocialProviders({ google: Boolean(data.google), loaded: true });
			})
			.catch(() => { if (!cancelled) setSocialProviders({ google: false, loaded: true }); });
		return () => { cancelled = true; };
	}, []);

	const signInWithProvider = async (provider: "google") => {
		if (oauthProvider) return;
		if (!socialProviders[provider]) {
			setError("Google 로그인은 아직 연결 설정이 완료되지 않았습니다.");
			return;
		}
		setError("");
		setOauthProvider(provider);
		try {
			const supabase = createClient();
			const { error: authError } = await supabase.auth.signInWithOAuth({
				provider,
				options: { redirectTo: `${window.location.origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}` },
			});
			if (authError) {
				setError("소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
				setOauthProvider(null);
			}
		} catch {
			setError("소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
			setOauthProvider(null);
		}
	};

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setMessage("");
		setNeedsConfirmation(false);

		if (mode === "sign-up" && password !== confirmPassword) {
			setError("비밀번호가 일치하지 않습니다.");
			return;
		}

		setIsSubmitting(true);
		try {
			const supabase = createClient();
			const result = mode === "sign-in"
				? await supabase.auth.signInWithPassword({ email, password })
				: await supabase.auth.signUp({
						email,
						password,
						options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
					});

			if (result.error) {
				if (result.error.code === "email_not_confirmed" || /email not confirmed/i.test(result.error.message)) {
					setNeedsConfirmation(true);
					setError("이메일 인증이 아직 완료되지 않았어요. 가입한 이메일의 받은편지함과 스팸함에서 인증 링크를 눌러 주세요.");
				} else if (result.error.code === "invalid_credentials") {
					setError("이메일 또는 비밀번호를 확인해 주세요. Google로 가입했다면 Google 로그인을 이용해 주세요.");
				} else { setError(result.error.message); }
				return;
			}

			if (mode === "sign-up" && !result.data.session) {
				setNeedsConfirmation(true);
				setMessage("가입 신청이 접수됐어요. 이메일 인증을 완료해야 로그인할 수 있습니다. 받은편지함과 스팸함을 확인해 주세요. 카카오톡에서 가입했다면 인증 링크를 연 뒤 다시 이 페이지로 돌아와 로그인해 주세요.");
				return;
			}

			const { data: { user } } = await supabase.auth.getUser();
			const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
			router.push(profile?.role === "admin" ? (safeNext?.startsWith("/admin") ? safeNext : "/admin") : (safeNext && !safeNext.startsWith("/admin") ? safeNext : "/account"));
			router.refresh();
		} catch { setError("로그인 요청을 완료하지 못했습니다. 다시 시도해 주세요."); }
		finally { setIsSubmitting(false); }
	};

	const resendConfirmation = async () => {
		if (!email.trim() || resending) return;
		setResending(true); setError(""); setMessage("");
		try {
			const { error: resendError } = await createClient().auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
			if (resendError) setError(resendError.status === 429 ? "인증 메일을 연속해서 요청했어요. 잠시 기다린 후 다시 시도해 주세요." : "인증 메일을 재발송하지 못했어요. 잠시 후 다시 시도해 주세요.");
			else setMessage("인증 메일을 다시 요청했어요. 받은편지함과 스팸함을 확인해 주세요.");
		} catch { setError("인증 메일 재발송 중 문제가 발생했어요."); }
		finally { setResending(false); }
	};

	const isSignUp = mode === "sign-up";

	return (
		<main className="mx-auto max-w-md px-6 py-20 text-center md:py-24">
			<p className="eyebrow">Casa di Stefano</p>
			<h1 className="mt-5 text-5xl">{isSignUp ? "Make yourself at home." : "Welcome back."}</h1>
			<p className="mt-5 text-[#684c38]">
				{isSignUp ? "Create an account for your coffee home." : "Sign in to follow your coffee home."}
			</p>

			<div className="mt-10 grid grid-cols-2 border-b border-[var(--line)]">
				<button type="button" onClick={() => { setMode("sign-in"); setError(""); setMessage(""); }} className={`pb-3 eyebrow ${!isSignUp ? "border-b border-[var(--ink)] text-[var(--ink)]" : "text-[var(--muted)]"}`}>
					로그인
				</button>
				<button type="button" onClick={() => { setMode("sign-up"); setError(""); setMessage(""); }} className={`pb-3 eyebrow ${isSignUp ? "border-b border-[var(--ink)] text-[var(--ink)]" : "text-[var(--muted)]"}`}>
					회원가입
				</button>
			</div>

			<form onSubmit={submit} className="mt-8 grid gap-3 text-left">
				<label className="sans text-xs font-bold tracking-[.08em]" htmlFor="email">이메일</label>
				<input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3 focus:border-[var(--ink)] focus:outline-none" />
				<label className="mt-2 sans text-xs font-bold tracking-[.08em]" htmlFor="password">비밀번호</label>
				<input id="password" type="password" required minLength={6} autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3 focus:border-[var(--ink)] focus:outline-none" />
				{isSignUp && <>
					<label className="mt-2 sans text-xs font-bold tracking-[.08em]" htmlFor="confirm-password">비밀번호 확인</label>
					<input id="confirm-password" type="password" required minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3 focus:border-[var(--ink)] focus:outline-none" />
				</>}
				<button type="submit" disabled={isSubmitting} className="button-primary mt-4 p-4 sans text-xs font-bold tracking-[.12em] disabled:cursor-wait disabled:opacity-60">
					{isSubmitting ? "처리 중..." : isSignUp ? "이메일로 가입하기" : "이메일로 로그인"}
				</button>
			</form>

			{error && <p role="alert" className="mt-5 sans text-sm text-[#a33f2b]">{error}</p>}
			{message && <p role="status" className="mt-5 sans text-sm text-[var(--brown)]">{message}</p>}
			{needsConfirmation && <div className="mt-4 border border-[var(--line)] p-4 text-left"><p className="sans text-sm">이메일 인증을 마치지 않았다면 로그인할 수 없습니다.</p><button type="button" disabled={resending || !email.trim()} onClick={resendConfirmation} className="button-secondary mt-3 px-4 py-3 text-sm disabled:opacity-50">{resending ? "재발송 중…" : "인증 메일 다시 보내기"}</button></div>}

			<div className="my-9 flex items-center gap-4 text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--line)]" /><span className="eyebrow">or</span><span className="h-px flex-1 bg-[var(--line)]" /></div>
			<div className="grid gap-3">
				<button type="button" disabled={oauthProvider !== null || !socialProviders.loaded || !socialProviders.google} onClick={() => signInWithProvider("google")} className="border border-[#211d18] p-4 sans text-xs font-bold tracking-[.12em] disabled:cursor-not-allowed disabled:opacity-50">{oauthProvider === "google" ? "GOOGLE로 이동 중…" : socialProviders.loaded && !socialProviders.google ? "GOOGLE LOGIN · 준비 중" : "CONTINUE WITH GOOGLE"}</button>
			</div>
			<p className="mt-8 sans text-xs text-[#684c38]">Guest checkout is available without an account.</p>
		</main>
	);
}
