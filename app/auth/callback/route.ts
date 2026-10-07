import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");
  const providerErrorDescription = url.searchParams.get("error_description");
  const next = safeNext(url.searchParams.get("next"));

  if (providerError || providerErrorDescription || !code) {
    const failure = new URL("/auth/error", request.url);
    failure.searchParams.set("reason", providerErrorDescription || providerError || "missing_code");
    return NextResponse.redirect(failure);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failure = new URL("/auth/error", request.url);
    failure.searchParams.set("reason", "session_exchange_failed");
    return NextResponse.redirect(failure);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
