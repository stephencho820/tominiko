import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { pageDefinitions, type PageSettings, type PageSlug } from "@/lib/page-content-config";

const fonts = new Set(["serif", "sans", "display"]);

function parseSettings(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as { slug?: unknown; texts?: unknown; images?: unknown };
  if (typeof body.slug !== "string" || !(body.slug in pageDefinitions) || !body.texts || typeof body.texts !== "object" || !body.images || typeof body.images !== "object") return null;
  const slug = body.slug as PageSlug;
  const definition = pageDefinitions[slug];
  const rawTexts = body.texts as Record<string, unknown>;
  const rawImages = body.images as Record<string, unknown>;
  const texts: PageSettings["texts"] = {};
  const images: PageSettings["images"] = {};

  for (const key of Object.keys(definition.texts)) {
    const setting = rawTexts[key];
    if (!setting || typeof setting !== "object") return null;
    const { value: text, font, size } = setting as Record<string, unknown>;
    if (typeof text !== "string" || text.length > 5_000 || typeof font !== "string" || !fonts.has(font) || typeof size !== "string" || size.length > 50) return null;
    texts[key] = { value: text, font: font as PageSettings["texts"][string]["font"], size };
  }
  for (const key of Object.keys(definition.images)) {
    const image = rawImages[key];
    if (typeof image !== "string" || image.length > 2_000 || (image && !image.startsWith("/") && !/^https:\/\//i.test(image))) return null;
    images[key] = image;
  }
  return { slug, texts, images };
}

export async function PUT(request: Request) {
  const supabase = await getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let settings;
  try { settings = parseSettings(await request.json()); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!settings) return NextResponse.json({ error: "Invalid page content" }, { status: 400 });
  const { error } = await supabase.from("page_settings").upsert({ ...settings, updated_at: new Date().toISOString() });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
