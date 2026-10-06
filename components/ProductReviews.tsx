"use client";
import { useMemo, useState } from "react";
import type { Review, ReviewStats } from "@/types";
import { optimizeReviewImage, type OptimizedReviewImage } from "@/lib/review-image";

const stars = (rating: number) => <span className="review-stars" aria-label={`${rating}점`}>{[1,2,3,4,5].map((n) => <span className={n <= Math.round(rating) ? "on" : ""} key={n}>★</span>)}</span>;
export function ProductReviews({ productId, initialReviews, stats, allowGuests, user }: { productId: string; initialReviews: Review[]; stats: ReviewStats; allowGuests: boolean; user: null | { id: string; name: string } }) {
  const [sort, setSort] = useState("new"), [visible, setVisible] = useState(5), [editing, setEditing] = useState<Review | null>(null), [lightbox, setLightbox] = useState<string | null>(null);
  const sorted = useMemo(() => [...initialReviews].sort((a,b) => sort === "high" ? b.rating-a.rating : sort === "low" ? a.rating-b.rating : sort === "photo" ? Number(b.review_images.length>0)-Number(a.review_images.length>0) || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at)), [initialReviews, sort]);
  const photos = initialReviews.flatMap((review) => review.review_images.map((image) => ({ ...image, reviewId: review.id })));
  const act = async (method: "PATCH"|"DELETE", body: object) => { const response = await fetch("/api/reviews", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (response.ok) location.reload(); else alert((await response.json()).error); };
  return <section className="reviews-section" id="reviews"><header className="reviews-heading"><div><p className="section-label">REVIEW</p>{stats.count ? <h2>{stats.average.toFixed(1)} {stars(stats.average)} <small>({stats.count} Reviews)</small></h2> : <h2>아직 작성된 리뷰가 없습니다.<small> 첫 리뷰를 남겨주세요.</small></h2>}</div>{stats.count > 0 && <div className="rating-bars">{[5,4,3,2,1].map((rating) => <div key={rating}><span>{rating}점</span><i><b style={{ width: `${stats.count ? stats.distribution[rating]/stats.count*100 : 0}%` }}/></i><small>{stats.distribution[rating]}</small></div>)}</div>}</header>
    {photos.length > 0 && <div className="photo-reviews"><p className="section-label">PHOTO REVIEWS</p><div>{photos.slice(0,12).map((photo) => <button type="button" key={photo.id} onClick={() => { document.getElementById(`review-${photo.reviewId}`)?.scrollIntoView({ behavior:"smooth" }); setLightbox(photo.image_url); }}><img src={photo.image_url} alt="리뷰 사진" /></button>)}</div></div>}
    {(user || allowGuests) ? <ReviewForm productId={productId} user={user} /> : <p className="review-login-note">리뷰를 작성하려면 로그인해주세요.</p>}
    {initialReviews.length > 0 && <div className="review-list-head"><strong>REVIEWS</strong><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="리뷰 정렬"><option value="new">최신순</option><option value="high">별점 높은순</option><option value="low">별점 낮은순</option><option value="photo">사진 리뷰 우선</option></select></div>}
    <div className="review-list">{sorted.slice(0,visible).map((review) => editing?.id === review.id ? <ReviewEdit key={review.id} review={review} onCancel={() => setEditing(null)} onSave={(values) => act("PATCH", { id:review.id, ...values })}/> : <article id={`review-${review.id}`} className="review-card" key={review.id}><div className="review-meta">{stars(review.rating)}<span>{review.reviewer_name}</span><time>{new Date(review.created_at).toLocaleDateString("ko-KR")}</time>{review.is_verified_purchase && <em>구매 확인</em>}</div>{review.title && <h3>{review.title}</h3>}<p>{review.content}</p>{review.review_images.length > 0 && <div className="review-images">{review.review_images.sort((a,b)=>a.sort_order-b.sort_order).map((image) => <button type="button" key={image.id} onClick={() => setLightbox(image.image_url)}><img src={image.image_url} alt="리뷰 첨부 사진" loading="lazy" /></button>)}</div>}{user?.id === review.user_id && <div className="review-actions"><button onClick={() => setEditing(review)}>수정</button><button onClick={() => confirm("리뷰를 삭제할까요?") && act("DELETE", { id:review.id })}>삭제</button></div>}</article>)}</div>
    {visible < sorted.length && <button className="review-more" onClick={() => setVisible((n)=>n+5)}>리뷰 더보기</button>}
    {lightbox && <div className="review-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}><button aria-label="닫기">×</button><img src={lightbox} alt="리뷰 사진 크게 보기" /></div>}
  </section>;
}

function Rating({ value, onChange }: { value: number; onChange: (n:number)=>void }) { return <div className="rating-input" aria-label="별점 선택">{[1,2,3,4,5].map((n)=><button type="button" aria-label={`${n}점`} className={n<=value?"on":""} onClick={()=>onChange(n)} key={n}>★</button>)}</div>; }
function ReviewForm({ productId, user }: { productId: string; user: null | { id: string; name: string } }) {
  const [rating, setRating] = useState(5);
  const [images, setImages] = useState<OptimizedReviewImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "optimizing" | "uploading">("idle");
  const [message, setMessage] = useState("");
  const previews = useMemo(() => images.map((image) => ({ image, url: URL.createObjectURL(image.file) })), [images]);

  const selectImages = async (files: File[]) => {
    setMessage("");
    if (files.length + images.length > 5) {
      setMessage("리뷰 사진은 최대 5장까지 등록할 수 있습니다.");
      return;
    }
    setPhase("optimizing");
    try {
      const optimized: OptimizedReviewImage[] = [];
      for (const file of files) optimized.push(await optimizeReviewImage(file));
      setImages((current) => [...current, ...optimized]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지를 최적화하지 못했습니다.");
    } finally {
      setPhase("idle");
    }
  };

  return <form className="review-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setPhase("uploading"); setMessage("");
    const data = new FormData(event.currentTarget); data.set("product_id", productId); data.set("rating", String(rating));
    images.forEach(({ file, width, height }) => { data.append("images", file); data.append("image_metadata", JSON.stringify({ width, height, fileSize: file.size })); });
    try {
      const response = await fetch("/api/reviews", { method: "POST", body: data });
      const result = await response.json();
      if (response.ok) location.reload();
      else setMessage(result.error || "리뷰 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } catch { setMessage("리뷰 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."); }
    finally { setBusy(false); setPhase("idle"); }
  }}>
    <h3>리뷰 작성</h3><Rating value={rating} onChange={setRating}/>
    {!user && <input name="reviewer_name" required maxLength={80} placeholder="이름 또는 닉네임 *"/>}
    {user && <p className="review-author">{user.name} 님으로 작성됩니다.</p>}
    <input name="title" maxLength={120} placeholder="한 줄 요약 (선택)"/>
    <textarea name="content" required maxLength={5000} placeholder="커피에 대한 경험을 들려주세요. *"/>
    <label className="review-upload">사진 추가 <small>JPG, PNG, WEBP, HEIC · 최대 5장</small><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={phase !== "idle"} onChange={(event) => { void selectImages(Array.from(event.target.files ?? [])); event.target.value = ""; }}/></label>
    {phase === "optimizing" && <p className="review-progress" role="status">이미지 최적화 중...</p>}
    {phase === "uploading" && <p className="review-progress" role="status">업로드 중...</p>}
    {previews.length > 0 && <div className="review-previews">{previews.map(({ image, url }, index) => <div key={image.file.name}><img src={url} alt="업로드 미리보기"/><button type="button" aria-label="사진 제거" onClick={() => setImages(images.filter((_, itemIndex) => itemIndex !== index))}>×</button><small>{Math.round(image.file.size / 1024)}KB</small></div>)}</div>}
    <button className="review-submit" disabled={busy || phase !== "idle"}>{busy ? "등록 중…" : "리뷰 등록"}</button>
    {message && <p className="review-error" role="alert">{message}</p>}
  </form>;
}
function ReviewEdit({review,onCancel,onSave}:{review:Review;onCancel:()=>void;onSave:(v:{rating:number;title:string;content:string})=>void}) { const [rating,setRating]=useState(review.rating),[title,setTitle]=useState(review.title??""),[content,setContent]=useState(review.content);return <div className="review-form"><Rating value={rating} onChange={setRating}/><input value={title} onChange={e=>setTitle(e.target.value)}/><textarea value={content} onChange={e=>setContent(e.target.value)}/><div><button className="review-submit" onClick={()=>onSave({rating,title,content})}>저장</button><button onClick={onCancel}>취소</button></div></div>}
