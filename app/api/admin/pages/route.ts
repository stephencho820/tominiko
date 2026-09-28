import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { pageDefinitions, type PageSlug, type TextSetting } from "@/lib/page-content-config";

const fonts = new Set<TextSetting["font"]>(["inherit", "serif", "sans", "display"]);
const validSize = (value: unknown) => typeof value === "string" && value.length <= 40 && !/[;{}]/.test(value);
const validImage = (value: unknown) => typeof value === "string" && value.length <= 2_000 && (!value || /^https:\/\//.test(value));

export async function PUT(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { slug?: string; texts?: unknown; images?: unknown };
  if (!body.slug || !(body.slug in pageDefinitions)) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  const slug = body.slug as PageSlug;
  const definition = pageDefinitions[slug];
  if (!body.texts || typeof body.texts !== "object" || Array.isArray(body.texts) || !body.images || typeof body.images !== "object" || Array.isArray(body.images)) return NextResponse.json({ error: "Invalid page content" }, { status: 400 });

  const rawTexts = body.texts as Record<string, unknown>;
  const rawImages = body.images as Record<string, unknown>;
  const texts: Record<string, TextSetting> = {};
  for (const key of Object.keys(definition.texts)) {
    const value = rawTexts[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) return NextResponse.json({ error: `Invalid text: ${key}` }, { status: 400 });
    const text = value as Partial<TextSetting>;
    if (typeof text.value !== "string" || text.value.length > 10_000 || !fonts.has(text.font as TextSetting["font"]) || !validSize(text.size)) return NextResponse.json({ error: `Invalid text: ${key}` }, { status: 400 });
    texts[key] = { value: text.value, font: text.font as TextSetting["font"], size: text.size as string };
  }
  const images: Record<string, string> = {};
  for (const key of Object.keys(definition.images)) {
    if (!validImage(rawImages[key])) return NextResponse.json({ error: `Invalid image: ${key}` }, { status: 400 });
    images[key] = rawImages[key] as string;
  }

  const { error } = await supabase.from("page_settings").upsert({ slug, texts, images, updated_at: new Date().toISOString() });
  if (error?.code === "42P01") return NextResponse.json({ error: "Page CMS is not installed. Run the page_settings Supabase migration first." }, { status: 503 });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
