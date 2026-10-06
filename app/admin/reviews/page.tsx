import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/types";
import { AdminReviewActions, GuestReviewSetting } from "@/components/AdminReviewActions";

export default async function AdminReviews() {
  const supabase = await createClient();
  const [reviewResult, settingResult] = await Promise.all([
    supabase.from("reviews").select("*,review_images(*),products(name,slug)").order("created_at", { ascending: false }),
    supabase.from("review_settings").select("allow_guest_reviews").eq("id", true).single(),
  ]);
  const reviews = (reviewResult.data ?? []) as Review[];
  const schemaMissing = reviewResult.error?.code === "PGRST205" || reviewResult.error?.message.includes("schema cache");

  return <main className="admin-main">
    <div className="admin-page-heading"><div><p className="eyebrow">Community</p><h1>Reviews</h1><p>공개 상태와 고객 사진을 관리합니다.</p></div><span className="admin-count">{reviews.length} reviews</span></div>
    {schemaMissing && <div className="admin-review-warning" role="alert"><strong>리뷰 데이터베이스가 설치되지 않았습니다.</strong><p>배포 환경과 동일한 Supabase 프로젝트에 migration을 적용한 후 <code>npm run check:reviews</code>로 확인해주세요.</p></div>}
    {!schemaMissing && <GuestReviewSetting initial={Boolean(settingResult.data?.allow_guest_reviews)}/>}
    <div className="admin-review-list">
      {reviews.map((review) => <article key={review.id}>
        <div className="admin-review-summary"><strong>{review.products?.name ?? "삭제된 상품"}</strong><span>{"★".repeat(review.rating)} · {review.reviewer_name}</span><time>{new Date(review.created_at).toLocaleString("ko-KR")}</time><em className={review.status}>{review.status}</em></div>
        {review.title && <h2>{review.title}</h2>}<p>{review.content}</p>
        {review.review_images.length > 0 && <div className="admin-review-images">{review.review_images.map((image) => <a href={image.image_url} target="_blank" rel="noreferrer" key={image.id}><img src={image.image_url} alt="리뷰 사진"/></a>)}</div>}
        <AdminReviewActions id={review.id} status={review.status}/>
      </article>)}
      {!schemaMissing && !reviews.length && <p className="admin-empty">아직 리뷰가 없습니다.</p>}
    </div>
  </main>;
}
