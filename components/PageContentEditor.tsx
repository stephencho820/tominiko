"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pageDefinitions, type PageSettings, type PageSlug, type PromotionBanner } from "@/lib/page-content-config";
import { TastingRoomEditor } from "./TastingRoomEditor";

export function PageContentEditor({ slug, initial }: { slug: PageSlug; initial: PageSettings }) {
  const definition = pageDefinitions[slug];
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const updateText = (key: string, patch: Partial<PageSettings["texts"][string]>) => setSettings((current) => ({ ...current, texts: { ...current.texts, [key]: { ...current.texts[key], ...patch } } }));
  const upload = async (key: string, file: File, onComplete?: (url: string) => void) => {
    const maxSize = file.type.startsWith("video/") ? 50 : 5;
    if (file.size > maxSize * 1024 * 1024) return setStatus(`Files of this type must be ${maxSize} MB or smaller.`);
    setBusy(true);
    setStatus("Uploading image…");
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${slug}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("page-images").upload(path, file);
      if (error) return setStatus(error.message);
      const { data } = supabase.storage.from("page-images").getPublicUrl(path);
      if (onComplete) onComplete(data.publicUrl);
      else setSettings((current) => ({ ...current, images: { ...current.images, [key]: data.publicUrl } }));
      setStatus("Media uploaded. Save the page to publish it.");
    } catch {
      setStatus("Could not upload the image. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  const updatePromotion = (id: string, patch: Partial<PromotionBanner>) => setSettings((current) => ({ ...current, promotions: (current.promotions ?? []).map((banner) => banner.id === id ? { ...banner, ...patch } : banner) }));
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setStatus("Saving…");
    try {
      const response = await fetch("/api/admin/pages", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, ...settings }) });
      const result = await response.json();
      setStatus(response.ok ? "Published successfully." : result.error ?? "Could not save.");
    } catch {
      setStatus("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="admin-page-editor">
    {slug === "tasting-room" && settings.tastingRoom && <TastingRoomEditor value={settings.tastingRoom} onChange={(tastingRoom) => setSettings((current) => ({ ...current, tastingRoom }))} onStatus={setStatus} onBusy={setBusy} />}
    {Object.keys(definition.texts).length > 0 && <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">{slug === "our-story" ? "Brand assets & philosophy" : "Text & typography"}</p><h2>{slug === "our-story" ? "Philosophy settings" : "Page copy"}</h2></div></div><p className="admin-muted">Line breaks are preserved. Leave text size empty to use the page&apos;s responsive default.</p>
      <div className="admin-content-fields">{Object.entries(definition.texts).map(([key, entry]) => <div className="admin-content-field" key={key}><label>{entry[0]}<textarea value={settings.texts[key]?.value ?? ""} onChange={(event) => updateText(key, { value: event.target.value })} /></label><div><label>Font<select value={settings.texts[key]?.font ?? "serif"} onChange={(event) => updateText(key, { font: event.target.value as "serif" | "sans" | "display" })}><option value="serif">Serif</option><option value="sans">Sans serif</option><option value="display">Display</option></select></label><label>Text size<input value={settings.texts[key]?.size ?? ""} placeholder="e.g. 48px, 5vw" onChange={(event) => updateText(key, { size: event.target.value })} /></label></div></div>)}</div>
    </section>}
    {slug === "home" && <>
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Hero media</p><h2>Opening visual</h2></div></div><p className="admin-muted">Upload a wide image or an MP4/WebM video. Videos play muted, inline, and on a loop.</p>
        <div className="admin-hero-media-editor"><div className="admin-image-preview">{settings.heroMedia?.type === "video" ? <video src={settings.heroMedia.url} muted controls /> : <img src={settings.heroMedia?.url} alt="" />}</div><div>
          <h3>Desktop media</h3>
          <label className="admin-field">Media type<select value={settings.heroMedia?.type ?? "image"} onChange={(event) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), type: event.target.value as "image" | "video" } }))}><option value="image">Image</option><option value="video">Video</option></select></label>
          <label className="admin-field">Upload desktop media<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("hero-desktop", file, (url) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), url, type: file.type.startsWith("video/") ? "video" : "image" } }))); }} /></label>
          <label className="admin-field">Desktop media URL<input value={settings.heroMedia?.url ?? ""} onChange={(event) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), url: event.target.value } }))} /></label>
          <h3>Mobile media <small>(optional)</small></h3>
          <label className="admin-field">Mobile media type<select value={settings.heroMedia?.mobileType ?? "image"} onChange={(event) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), mobileType: event.target.value as "image" | "video" } }))}><option value="image">Image</option><option value="video">Video</option></select></label>
          <label className="admin-field">Upload mobile media<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("hero-mobile", file, (url) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), mobileUrl: url, mobileType: file.type.startsWith("video/") ? "video" : "image" } }))); }} /></label>
          <label className="admin-field">Mobile media URL<input value={settings.heroMedia?.mobileUrl ?? ""} placeholder="Falls back to desktop media" onChange={(event) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), mobileUrl: event.target.value } }))} /></label>
          <div className="admin-toggle-row"><label><input type="checkbox" checked={settings.heroMedia?.active ?? true} onChange={(event) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), active: event.target.checked } }))} /><span>Active<small>Show the uploaded media</small></span></label><label><input type="checkbox" checked={settings.heroMedia?.overlay ?? true} onChange={(event) => setSettings((current) => ({ ...current, heroMedia: { ...(current.heroMedia!), overlay: event.target.checked } }))} /><span>Overlay<small>Subtle dark CTA contrast</small></span></label></div>
        </div></div>
      </section>
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Editorial banners</p><h2>Tasting Room &amp; Philosophy</h2></div></div><p className="admin-muted">Upload finished artwork including all titles, descriptions, and CTA text. The storefront adds no text over these images.</p>
        <div className="admin-promotion-list">{(settings.promotions ?? []).map((banner) => <article key={banner.id} className="admin-promotion-item"><div className="admin-image-preview">{banner.image ? <img src={banner.image} alt="" /> : <span>No image</span>}</div><div className="admin-promotion-fields">
          <h3>{banner.placement === "tasting-room" ? "Tasting Room Banner" : "Philosophy Banner"}</h3>
          <label className="admin-field">Desktop image URL<input value={banner.image} onChange={(event) => updatePromotion(banner.id, { image: event.target.value })} /></label>
          <label className="admin-field">Upload desktop image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(`promotion-${banner.id}-desktop`, file, (url) => updatePromotion(banner.id, { image: url })); }} /></label>
          <label className="admin-field">Mobile image URL <small>Optional · falls back to desktop</small><input value={banner.mobileImage} onChange={(event) => updatePromotion(banner.id, { mobileImage: event.target.value })} /></label>
          <label className="admin-field">Upload mobile image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(`promotion-${banner.id}-mobile`, file, (url) => updatePromotion(banner.id, { mobileImage: url })); }} /></label>
          <label className="admin-field">Hyperlink<input value={banner.hyperlink} onChange={(event) => updatePromotion(banner.id, { hyperlink: event.target.value })} /></label>
          <label className="admin-checkbox"><input type="checkbox" checked={banner.active} onChange={(event) => updatePromotion(banner.id, { active: event.target.checked })} /> Active</label>
        </div></article>)}</div>
      </section>
    </>}
    {Object.keys(definition.images).length > 0 && <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">{slug === "our-story" ? "Brand assets" : "Photography"}</p><h2>{slug === "our-story" ? "Brand logos" : "Page images"}</h2></div></div>{slug === "our-story" && <p className="admin-muted">Upload transparent PNG, WebP, or SVG logos. Links are fixed to Tasting Room, the philosophy anchor, and Shop.</p>}<div className="admin-image-fields">{Object.entries(definition.images).map(([key, entry]) => <div key={key}><div className="admin-image-preview">{settings.images[key] ? <img src={settings.images[key]} alt="" /> : <span>No image</span>}</div><label className="admin-field">{entry[0]}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(key, file); }} /></label><label className="admin-field">Or paste an image URL<input value={settings.images[key] ?? ""} onChange={(event) => setSettings((current) => ({ ...current, images: { ...current.images, [key]: event.target.value } }))} /></label></div>)}</div></section>}
    <div className="admin-editor-save"><span role="status">{status}</span><a href={definition.path} target="_blank" rel="noreferrer">Preview ↗</a><button className="admin-primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Working…" : "Save & publish"}</button></div>
  </div>;
}
