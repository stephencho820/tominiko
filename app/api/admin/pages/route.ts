import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { pageDefinitions } from "@/lib/page-content-config";

export async function PUT(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json() as { slug?: string; texts?: unknown; images?: unknown };
  if (!body.slug || !(body.slug in pageDefinitions) || !body.texts || !body.images) return NextResponse.json({ error: "Invalid page content" }, { status: 400 });
  const { error } = await supabase.from("page_settings").upsert({ slug: body.slug, texts: body.texts, images: body.images, updated_at: new Date().toISOString() });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
