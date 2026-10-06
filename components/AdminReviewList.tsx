"use client";
import { useState } from "react";
import type { Review } from "@/types";
import { AdminReviewActions } from "./AdminReviewActions";

export function AdminReviewList({ reviews }: { reviews: Review[] }) {
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase();
  const visible = reviews.filter(review => (status === "all" || review.status === status)
    && (rating === "all" || review.rating === Number(rating))
    && [review.reviewer_name, review.title, review.content, review.products?.name].some(value => value?.toLocaleLowerCase().includes(term)));
  return <>
    <div className="admin-form-grid">
      <label>상태<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">전체</option><option value="published">published</option><option value="hidden">hidden</option></select></label>
      <label>별점<select value={rating} onChange={e => setRating(e.target.value)}><option value="all">전체</option>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="작성자, 제목, 내용, 상품명" /></label>
    </div>
    <div className="admin-review-list">
      {visible.map(review => <article key={review.id}>
        <div className="admin-review-summary"><strong>{review.products?.name ?? "삭제된 상품"}</strong><span>{"★".repeat(review.rating)} · {review.reviewer_name}</span><time>{new Date(review.created_at).toLocaleString("ko-KR")}</time><em className={review.status}>{review.status}</em></div>
        {review.title && <h2>{review.title}</h2>}<p>{review.content}</p>
        {review.review_images.length > 0 && <div className="admin-review-images">{review.review_images.map(image => <a href={image.image_url} target="_blank" rel="noreferrer" key={image.id}><img src={image.image_url} alt="리뷰 사진" /></a>)}</div>}
        <AdminReviewActions id={review.id} status={review.status} reviewer={review.reviewer_name} />
      </article>)}
      {!visible.length && <p className="admin-empty">{reviews.length ? "조건에 맞는 리뷰가 없습니다." : "아직 리뷰가 없습니다."}</p>}
    </div>
  </>;
}
