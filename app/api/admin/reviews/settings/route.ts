import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
export async function PATCH(request: Request) {
  try {
    const client = await getAdminClient();
    if (!client) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "올바른 JSON 요청을 보내 주세요." }, { status: 400 }); }
    if (!body || typeof body.allow_guest_reviews !== "boolean") return NextResponse.json({ error: "올바른 설정을 보내 주세요." }, { status: 400 });
    const { data, error } = await client.from("review_settings").update({ allow_guest_reviews: body.allow_guest_reviews, updated_at: new Date().toISOString() }).eq("id", true).select("id").maybeSingle();
    return error || !data ? NextResponse.json({ error: "리뷰 설정을 저장하지 못했습니다." }, { status: 500 }) : NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "리뷰 설정을 저장하지 못했습니다." }, { status: 500 }); }
}
