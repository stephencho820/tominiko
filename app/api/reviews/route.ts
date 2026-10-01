import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminClient } from "@/lib/supabase/admin";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const clean = (value: FormDataEntryValue | null, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const form = await request.formData();
  const productId = clean(form.get("product_id"), 80), content = clean(form.get("content"), 5000), title = clean(form.get("title"), 120);
  const rating = Number(form.get("rating"));
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (!productId || !content || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "별점과 리뷰 내용을 확인해주세요." }, { status: 400 });
  if (files.length > 5 || files.some((file) => !imageTypes.has(file.type) || file.size > 5 * 1024 * 1024)) return NextResponse.json({ error: "사진은 JPG, PNG, WEBP 형식으로 최대 5장(각 5MB)까지 가능합니다." }, { status: 400 });
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  const service = createServiceClient();
  const { data: setting } = await service.from("review_settings").select("allow_guest_reviews").eq("id", true).single();
  if (!user && !setting?.allow_guest_reviews) return NextResponse.json({ error: "로그인 후 리뷰를 작성할 수 있습니다." }, { status: 401 });
  let reviewerName = clean(form.get("reviewer_name"), 80);
  if (user) { const { data: profile } = await service.from("profiles").select("name").eq("id", user.id).maybeSingle(); reviewerName = profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || reviewerName; }
  if (!reviewerName) return NextResponse.json({ error: "이름 또는 닉네임을 입력해주세요." }, { status: 400 });
  const { data: product } = await service.from("products").select("id").eq("id", productId).maybeSingle();
  if (!product) return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  let verified = false, orderId: string | null = null;
  if (user) { const { data: purchase } = await service.from("order_items").select("order_id,orders!inner(user_id,payment_status)").eq("product_id", productId).eq("orders.user_id", user.id).eq("orders.payment_status", "paid").limit(1).maybeSingle(); verified = Boolean(purchase); orderId = purchase?.order_id ?? null; }
  const { data: review, error } = await service.from("reviews").insert({ product_id: productId, user_id: user?.id ?? null, order_id: orderId, rating, title: title || null, content, reviewer_name: reviewerName, is_verified_purchase: verified }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const uploaded: { review_id: string; image_url: string; sort_order: number }[] = [];
  for (const [index, file] of files.entries()) { const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; const path = `${productId}/${review.id}/${index}-${crypto.randomUUID()}.${extension}`; const result = await service.storage.from("review-images").upload(path, file, { contentType: file.type }); if (result.error) continue; const { data } = service.storage.from("review-images").getPublicUrl(path); uploaded.push({ review_id: review.id, image_url: data.publicUrl, sort_order: index }); }
  if (uploaded.length) await service.from("review_images").insert(uploaded);
  return NextResponse.json({ ok: true, id: review.id });
}

export async function PATCH(request: Request) {
  const body = await request.json(); const id = typeof body.id === "string" ? body.id : "";
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user || !id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getAdminClient();
  if (admin && ["published", "hidden"].includes(body.status)) { const { error } = await admin.from("reviews").update({ status: body.status }).eq("id", id); return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 400 : 200 }); }
  const rating = Number(body.rating), content = String(body.content ?? "").trim().slice(0, 5000), title = String(body.title ?? "").trim().slice(0, 120);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !content) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const { error } = await client.from("reviews").update({ rating, title: title || null, content, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 400 : 200 });
}

export async function DELETE(request: Request) {
  const { id } = await request.json(); const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user || typeof id !== "string") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getAdminClient(); const query = (admin ?? client).from("reviews").delete().eq("id", id); if (!admin) query.eq("user_id", user.id);
  const { error } = await query; return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 400 : 200 });
}
