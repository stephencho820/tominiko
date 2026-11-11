import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWelcomeBenefit } from "@/lib/welcome-discount";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!hasSupabaseEnv) return NextResponse.json({ enabled: false, signedIn: false, eligible: false, amount: 0 }, { headers });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return NextResponse.json(await getWelcomeBenefit(user), { headers });
  } catch {
    return NextResponse.json({ error: "혜택 정보를 확인하지 못했습니다." }, { status: 503, headers });
  }
}
