"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validatePageMedia, MAX_PAGE_GALLERY_IMAGES } from "@/lib/page-media";
import type { GalleryImage, TastingRoomSettings } from "@/lib/page-content-config";

type Props = { value: TastingRoomSettings; onChange: (value: TastingRoomSettings) => void; onStatus: (message: string) => void; onBusy: (busy: boolean) => void; busy: boolean; isBusy: () => boolean };

export function TastingRoomEditor({ value, onChange, onStatus, onBusy, busy, isBusy }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(false);
  const patch = (next: Partial<TastingRoomSettings>) => onChange({ ...value, ...next });
  const uploadFiles = async (files: File[], kind: "hero" | "mobile-hero" | "gallery") => {
    if (!files.length || uploadRef.current || isBusy()) return;
    if (kind === "gallery" && valueRef.current.galleryImages.length + files.length > MAX_PAGE_GALLERY_IMAGES) return onStatus("갤러리는 최대 50개까지 등록할 수 있습니다.");
    for (const file of files) {
      const validation = validatePageMedia(file);
      if (validation.error) return onStatus(validation.error);
    }
    uploadRef.current = true;
    setUploading(true); onBusy(true); onStatus(`Uploading ${files.length} image${files.length > 1 ? "s" : ""}…`);
    try {
      const supabase = createClient();
      const uploaded: GalleryImage[] = [];
      for (const file of files) {
        const id = crypto.randomUUID();
        const path = `tasting-room/${kind}-${id}.${validatePageMedia(file).extension}`;
        const { error } = await supabase.storage.from("page-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("page-images").getPublicUrl(path);
        uploaded.push({ id, url: data.publicUrl, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), order: 0 });
      }
      if (kind === "hero") onChange({ ...valueRef.current, heroImage: uploaded[0].url });
      else if (kind === "mobile-hero") onChange({ ...valueRef.current, mobileHeroImage: uploaded[0].url });
      else {
        const existing = valueRef.current.galleryImages;
        onChange({ ...valueRef.current, galleryImages: [...existing, ...uploaded].map((image, order) => ({ ...image, order })) });
      }
      onStatus("Images uploaded. Save the page to publish them.");
    } catch { onStatus("이미지를 업로드하지 못했습니다. 연결을 확인하고 다시 시도해 주세요."); }
    finally { uploadRef.current = false; setUploading(false); onBusy(false); }
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...value.galleryImages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ galleryImages: next.map((image, order) => ({ ...image, order })) });
  };
  return <>
    <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Hero</p><h2>Tasting Room Hero Image</h2></div></div>
      <div className="admin-room-hero"><div className="admin-image-preview">{value.heroImage ? <img src={value.heroImage} alt="Current tasting room hero" /> : <span>Default image</span>}</div><div><label className="admin-field">Upload desktop hero image<input type="file" disabled={busy || uploading} accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []).slice(0, 1), "hero")} /></label><label className="admin-field">Desktop image URL<input value={value.heroImage} placeholder="Uses the default artwork when empty" onChange={(event) => patch({ heroImage: event.target.value })} /></label></div></div>
      <div className="admin-room-hero"><div className="admin-image-preview">{value.mobileHeroImage ? <img src={value.mobileHeroImage} alt="Current mobile tasting room hero" /> : <span>Uses default mobile artwork</span>}</div><div><label className="admin-field">Upload mobile hero image<input type="file" disabled={busy || uploading} accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []).slice(0, 1), "mobile-hero")} /></label><label className="admin-field">Mobile image URL<input value={value.mobileHeroImage} placeholder="Uses the default mobile artwork when empty" onChange={(event) => patch({ mobileHeroImage: event.target.value })} /></label></div></div>
    </section>
    <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Visit</p><h2>Location details</h2></div></div><div className="admin-content-fields">
      <div className="admin-content-field"><label>Address<textarea value={value.address} onChange={(event) => patch({ address: event.target.value })} /></label></div>
      <div className="admin-content-field"><label>Phone<input value={value.phone} onChange={(event) => patch({ phone: event.target.value })} /></label><label>Phone Note<textarea value={value.phoneNote} onChange={(event) => patch({ phoneNote: event.target.value })} /></label></div>
      <div className="admin-content-field"><label>Opening Hours<textarea value={value.openingHours} placeholder={"화–금 11:00–18:00\n토–일 11:00–19:00\n월요일 휴무"} onChange={(event) => patch({ openingHours: event.target.value })} /></label></div>
    </div></section>
    <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Gallery</p><h2>Tasting Room Gallery</h2></div></div><p className="admin-muted">Select several images at once. Their saved order is their storefront order.</p>
      <label className="admin-field admin-gallery-upload">Upload images<input type="file" disabled={busy || uploading} multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []), "gallery")} /></label>
      <div className="admin-gallery-list">{value.galleryImages.map((image, index) => <article key={image.id}><img src={image.url} alt="" /><div><label className="admin-field">Alt text<input value={image.alt} onChange={(event) => patch({ galleryImages: value.galleryImages.map((item) => item.id === image.id ? { ...item, alt: event.target.value } : item) })} /></label><span>{String(index + 1).padStart(2, "0")}</span><button type="button" aria-label="Move image left" disabled={busy || index === 0} onClick={() => move(index, -1)}>←</button><button type="button" aria-label="Move image right" disabled={busy || index === value.galleryImages.length - 1} onClick={() => move(index, 1)}>→</button><button type="button" disabled={busy} onClick={() => patch({ galleryImages: value.galleryImages.filter((item) => item.id !== image.id).map((item, order) => ({ ...item, order })) })}>Remove</button></div></article>)}</div>
    </section>
  </>;
}
