import { createClient } from "@/lib/supabase/server";
import { runSupabaseQuery } from "@/lib/supabase/query";
import type { Review } from "@/types";
import { GuestReviewSetting } from "@/components/AdminReviewActions";
import { AdminReviewList } from "@/components/AdminReviewList";

export default async function AdminReviews() {
  const supabase = await createClient().catch(() => null);
  if (!supabase) return <main className="admin-main"><h1>Reviews</h1><p role="alert">리뷰 데이터를 불러오지 못했습니다.</p><p role="alert">리뷰 설정을 불러오지 못했습니다.</p></main>;
  const [reviewResult, settingResult] = await Promise.allSettled([
    runSupabaseQuery(async (signal) => await supabase.from("reviews").select("*,review_images(*),products(name,slug)").order("created_at", { ascending: false }).abortSignal(signal)),
    runSupabaseQuery(async (signal) => await supabase.from("review_settings").select("allow_guest_reviews").eq("id", true).abortSignal(signal).single()),
  ]);
  const reviewError = reviewResult.status === "rejected" ? true : reviewResult.value.error;
  const schemaMissing = reviewResult.status === "fulfilled" && ["PGRST205", "PGRST200", "42P01"].includes(reviewResult.value.error?.code ?? "");
  const reviews = (reviewResult.status === "fulfilled" ? reviewResult.value.data ?? [] : []) as Review[];
  const setting = settingResult.status === "fulfilled" && !settingResult.value.error ? settingResult.value.data : null;
  return <main className="admin-main">
    <div className="admin-page-heading"><div><p className="eyebrow">Community</p><h1>Reviews</h1><p>공개 상태와 고객 사진을 관리합니다.</p></div>{!reviewError && <span className="admin-count">{reviews.length} reviews</span>}</div>
    {schemaMissing && <div className="admin-review-warning" role="alert"><strong>리뷰 데이터베이스가 설치되지 않았습니다.</strong><p>배포 환경과 동일한 Supabase 프로젝트의 기존 migration 적용 상태를 확인해주세요.</p></div>}
    {reviewError && !schemaMissing && <p role="alert">리뷰 데이터를 불러오지 못했습니다.</p>}
    {setting ? <GuestReviewSetting initial={setting.allow_guest_reviews} /> : <p role="alert">리뷰 설정을 불러오지 못했습니다.</p>}
    {!reviewError && <AdminReviewList reviews={reviews} />}
  </main>;
}
