import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminClient } from "@/lib/supabase/admin";

const publicError = "리뷰 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
const clean = (value: FormDataEntryValue | null, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const fail = (message = publicError, status = 400) => NextResponse.json({ error: message }, { status });

type ImageMetadata = { width: number; height: number; fileSize: number };
function imageMetadata(values: FormDataEntryValue[], files: File[]) {
  if (values.length !== files.length) return null;
  try {
    const parsed = values.map((value) => JSON.parse(String(value)) as ImageMetadata);
    return parsed.every((item, index) => Number.isInteger(item.width) && item.width > 0 && item.width <= 1600 && Number.isInteger(item.height) && item.height > 0 && item.height <= 1600 && item.fileSize === files[index].size) ? parsed : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const productId = clean(form.get("product_id"), 80), content = clean(form.get("content"), 5000), title = clean(form.get("title"), 120);
  const rating = Number(form.get("rating"));
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  const metadata = imageMetadata(form.getAll("image_metadata"), files);
  if (!productId || !content || !Number.isInteger(rating) || rating < 1 || rating > 5) return fail("별점과 리뷰 내용을 확인해주세요.");
  if (files.length > 5) return fail("리뷰 사진은 최대 5장까지 등록할 수 있습니다.");
  if (files.some((file) => file.type !== "image/webp" || file.size > 5 * 1024 * 1024) || !metadata) return fail("사진 최적화 정보를 확인할 수 없습니다. 사진을 다시 선택해주세요.");

  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  const service = createServiceClient();
  const { data: setting, error: settingError } = await service.from("review_settings").select("allow_guest_reviews").eq("id", true).single();
  if (settingError) { console.error("Review schema is not ready", settingError); return fail(); }
  if (!user && !setting.allow_guest_reviews) return fail("로그인 후 리뷰를 작성할 수 있습니다.", 401);
  let reviewerName = clean(form.get("reviewer_name"), 80);
  if (user) { const { data: profile } = await service.from("profiles").select("name").eq("id", user.id).maybeSingle(); reviewerName = profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || reviewerName; }
  if (!reviewerName) return fail("이름 또는 닉네임을 입력해주세요.");
  const { data: product } = await service.from("products").select("id").eq("id", productId).maybeSingle();
  if (!product) return fail("상품을 찾을 수 없습니다.", 404);

  let verified = false, orderId: string | null = null;
  if (user) { const { data: purchase } = await service.from("order_items").select("order_id,orders!inner(user_id,payment_status)").eq("product_id", productId).eq("orders.user_id", user.id).eq("orders.payment_status", "paid").limit(1).maybeSingle(); verified = Boolean(purchase); orderId = purchase?.order_id ?? null; }
  const { data: review, error: reviewError } = await service.from("reviews").insert({ product_id: productId, user_id: user?.id ?? null, order_id: orderId, rating, title: title || null, content, reviewer_name: reviewerName, is_verified_purchase: verified }).select().single();
  if (reviewError) { console.error("Review insert failed", reviewError); return fail(); }

  const paths: string[] = [];
  try {
    const imageRows = [];
    for (const [index, file] of files.entries()) {
      const path = `reviews/${productId}/${review.id}/${crypto.randomUUID()}.webp`;
      const upload = await service.storage.from("review-images").upload(path, file, { contentType: "image/webp", upsert: false });
      if (upload.error) throw upload.error;
      paths.push(path);
      const { data } = service.storage.from("review-images").getPublicUrl(path);
      imageRows.push({ review_id: review.id, image_url: data.publicUrl, storage_path: path, sort_order: index, width: metadata![index].width, height: metadata![index].height, file_size: file.size });
    }
    if (imageRows.length) { const { error } = await service.from("review_images").insert(imageRows); if (error) throw error; }
  } catch (error) {
    console.error("Review image persistence failed", error);
    if (paths.length) await service.storage.from("review-images").remove(paths);
    await service.from("reviews").delete().eq("id", review.id);
    return fail();
  }
  return NextResponse.json({ ok: true, id: review.id });
}

export async function PATCH(request: Request) {
  const body = await request.json(); const id = typeof body.id === "string" ? body.id : "";
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user || !id) return fail("권한이 없습니다.", 403);
  const admin = await getAdminClient();
  if (admin && ["published", "hidden"].includes(body.status)) { const { error } = await admin.from("reviews").update({ status: body.status }).eq("id", id); if (error) console.error("Review moderation failed", error); return error ? fail() : NextResponse.json({ ok: true }); }
  const rating = Number(body.rating), content = String(body.content ?? "").trim().slice(0, 5000), title = String(body.title ?? "").trim().slice(0, 120);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !content) return fail("별점과 리뷰 내용을 확인해주세요.");
  const { error } = await client.from("reviews").update({ rating, title: title || null, content, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) console.error("Review update failed", error);
  return error ? fail() : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { id } = await request.json(); const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user || typeof id !== "string") return fail("권한이 없습니다.", 403);
  const admin = await getAdminClient(); const service = createServiceClient();
  const { data: review } = await service.from("reviews").select("id,user_id,review_images(storage_path)").eq("id", id).maybeSingle();
  if (!review || (!admin && review.user_id !== user.id)) return fail("권한이 없습니다.", 403);
  const paths = (review.review_images ?? []).map((image: { storage_path: string }) => image.storage_path).filter(Boolean);
  if (paths.length) { const { error } = await service.storage.from("review-images").remove(paths); if (error) { console.error("Review image cleanup failed", error); return fail(); } }
  const { error } = await service.from("reviews").delete().eq("id", id);
  if (error) console.error("Review delete failed", error);
  return error ? fail() : NextResponse.json({ ok: true });
}
