import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ google: false }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Auth settings unavailable");
    const settings = await response.json() as { external?: Record<string, boolean> };
    return NextResponse.json({
      google: settings.external?.google === true,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ google: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
