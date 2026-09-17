"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export default function Login() {
	const router = useRouter();
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const signInWithProvider = async (provider: "google" | "kakao") => {
		const supabase = createClient();
		await supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: `${window.location.origin}/auth/callback` },
		});
	};

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setMessage("");

		if (mode === "sign-up" && password !== confirmPassword) {
			setError("비밀번호가 일치하지 않습니다.");
			return;
		}

		setIsSubmitting(true);
		const supabase = createClient();
		const result = mode === "sign-in"
			? await supabase.auth.signInWithPassword({ email, password })
			: await supabase.auth.signUp({
					email,
					password,
					options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
				});

		if (result.error) {
			setError(result.error.message);
			setIsSubmitting(false);
			return;
		}

		if (mode === "sign-up" && !result.data.session) {
			setMessage("가입이 완료되었습니다. 이메일의 확인 링크를 눌러 로그인을 완료해 주세요.");
			setIsSubmitting(false);
			return;
		}

		router.push("/account");
		router.refresh();
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

			<div className="my-9 flex items-center gap-4 text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--line)]" /><span className="eyebrow">or</span><span className="h-px flex-1 bg-[var(--line)]" /></div>
			<div className="grid gap-3">
				<button onClick={() => signInWithProvider("google")} className="border border-[#211d18] p-4 sans text-xs font-bold tracking-[.12em]">CONTINUE WITH GOOGLE</button>
				<button onClick={() => signInWithProvider("kakao")} className="bg-[#fee500] p-4 sans text-xs font-bold tracking-[.12em]">CONTINUE WITH KAKAO</button>
			</div>
			<p className="mt-8 sans text-xs text-[#684c38]">Guest checkout is available without an account.</p>
		</main>
	);
}