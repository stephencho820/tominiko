import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isUUID } from "@/lib/admin-delivery-validation";

const fail = (error = "리뷰 작업을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.", status = 500) => NextResponse.json({ error }, { status });

async function moderate(request: Request, method: "PATCH" | "DELETE") {
  try {
    const admin = await getAdminClient();
    if (!admin) return fail("권한이 없습니다.", 403);
    let body;
    try { body = await request.json(); } catch { return fail("올바른 JSON 요청을 보내 주세요.", 400); }
    if (!body || !isUUID(body.id) || (method === "PATCH" && body.status !== "published" && body.status !== "hidden")) return fail("리뷰 ID와 공개 상태를 확인해 주세요.", 400);
    if (method === "PATCH") {
      const { data, error } = await admin.from("reviews").update({ status: body.status }).eq("id", body.id).select("id").maybeSingle();
      return error ? fail() : data ? NextResponse.json({ ok: true }) : fail("리뷰를 찾을 수 없습니다.", 404);
    }
    // The authorized admin client has RLS permission for both review rows and storage.
    // Keep the row (and image paths) if cleanup fails, so an administrator can retry.
    const { data: review, error: readError } = await admin.from("reviews").select("id,review_images(storage_path)").eq("id", body.id).maybeSingle();
    if (readError) return fail();
    if (!review) return fail("리뷰를 찾을 수 없습니다.", 404);
    const paths = (review.review_images ?? []).map((image: { storage_path: string }) => image.storage_path).filter(Boolean);
    if (paths.length) {
      const { error } = await admin.storage.from("review-images").remove(paths);
      if (error) return fail("리뷰 사진을 삭제하지 못했습니다. 다시 시도해 주세요.");
    }
    const { error } = await admin.from("reviews").delete().eq("id", body.id);
    return error ? fail() : NextResponse.json({ ok: true });
  } catch { return fail(); }
}
export async function PATCH(request: Request) { return moderate(request, "PATCH"); }
export async function DELETE(request: Request) { return moderate(request, "DELETE"); }
