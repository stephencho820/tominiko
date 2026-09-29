"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GalleryImage, TastingRoomSettings } from "@/lib/page-content-config";

type Props = { value: TastingRoomSettings; onChange: (value: TastingRoomSettings) => void; onStatus: (message: string) => void; onBusy: (busy: boolean) => void };

export function TastingRoomEditor({ value, onChange, onStatus, onBusy }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const [uploading, setUploading] = useState(false);
  const patch = (next: Partial<TastingRoomSettings>) => onChange({ ...value, ...next });
  const uploadFiles = async (files: File[], kind: "hero" | "gallery") => {
    if (!files.length || uploading) return;
    if (files.some((file) => file.size > 5 * 1024 * 1024)) return onStatus("Images must be 5 MB or smaller.");
    setUploading(true); onBusy(true); onStatus(`Uploading ${files.length} image${files.length > 1 ? "s" : ""}…`);
    try {
      const supabase = createClient();
      const uploaded: GalleryImage[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const id = crypto.randomUUID();
        const path = `tasting-room/${kind}-${id}-${safeName}`;
        const { error } = await supabase.storage.from("page-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("page-images").getPublicUrl(path);
        uploaded.push({ id, url: data.publicUrl, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), order: 0 });
      }
      if (kind === "hero") onChange({ ...valueRef.current, heroImage: uploaded[0].url });
      else {
        const existing = valueRef.current.galleryImages;
        onChange({ ...valueRef.current, galleryImages: [...existing, ...uploaded].map((image, order) => ({ ...image, order })) });
      }
      onStatus("Images uploaded. Save the page to publish them.");
    } catch (error) { onStatus(error instanceof Error ? error.message : "Could not upload the images."); }
    finally { setUploading(false); onBusy(false); }
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
      <div className="admin-room-hero"><div className="admin-image-preview">{value.heroImage ? <img src={value.heroImage} alt="Current tasting room hero" /> : <span>Default image</span>}</div><div><label className="admin-field">Upload hero image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []).slice(0, 1), "hero")} /></label><label className="admin-field">Image URL<input value={value.heroImage} placeholder="Uses the default artwork when empty" onChange={(event) => patch({ heroImage: event.target.value })} /></label></div></div>
    </section>
    <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Visit</p><h2>Location details</h2></div></div><div className="admin-content-fields">
      <div className="admin-content-field"><label>Address<textarea value={value.address} onChange={(event) => patch({ address: event.target.value })} /></label></div>
      <div className="admin-content-field"><label>Phone<input value={value.phone} onChange={(event) => patch({ phone: event.target.value })} /></label><label>Phone Note<textarea value={value.phoneNote} onChange={(event) => patch({ phoneNote: event.target.value })} /></label></div>
      <div className="admin-content-field"><label>Opening Hours<textarea value={value.openingHours} placeholder={"화–금 11:00–18:00\n토–일 11:00–19:00\n월요일 휴무"} onChange={(event) => patch({ openingHours: event.target.value })} /></label></div>
    </div></section>
    <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Gallery</p><h2>Tasting Room Gallery</h2></div></div><p className="admin-muted">Select several images at once. Their saved order is their storefront order.</p>
      <label className="admin-field admin-gallery-upload">Upload images<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []), "gallery")} /></label>
      <div className="admin-gallery-list">{value.galleryImages.map((image, index) => <article key={image.id}><img src={image.url} alt="" /><div><label className="admin-field">Alt text<input value={image.alt} onChange={(event) => patch({ galleryImages: value.galleryImages.map((item) => item.id === image.id ? { ...item, alt: event.target.value } : item) })} /></label><span>{String(index + 1).padStart(2, "0")}</span><button type="button" aria-label="Move image left" disabled={index === 0} onClick={() => move(index, -1)}>←</button><button type="button" aria-label="Move image right" disabled={index === value.galleryImages.length - 1} onClick={() => move(index, 1)}>→</button><button type="button" onClick={() => patch({ galleryImages: value.galleryImages.filter((item) => item.id !== image.id).map((item, order) => ({ ...item, order })) })}>Remove</button></div></article>)}</div>
    </section>
  </>;
}
