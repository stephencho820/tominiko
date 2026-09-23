"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pageDefinitions, type PageSettings, type PageSlug } from "@/lib/page-content-config";

export function PageContentEditor({ slug, initial }: { slug: PageSlug; initial: PageSettings }) {
  const definition = pageDefinitions[slug];
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState("");
  const updateText = (key: string, patch: Partial<PageSettings["texts"][string]>) => setSettings((current) => ({ ...current, texts: { ...current.texts, [key]: { ...current.texts[key], ...patch } } }));
  const upload = async (key: string, file: File) => {
    setStatus("Uploading image…");
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${slug}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("page-images").upload(path, file);
    if (error) return setStatus(error.message);
    const { data } = supabase.storage.from("page-images").getPublicUrl(path);
    setSettings((current) => ({ ...current, images: { ...current.images, [key]: data.publicUrl } }));
    setStatus("Image uploaded. Save the page to publish it.");
  };
  const save = async () => {
    setStatus("Saving…");
    const response = await fetch("/api/admin/pages", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, ...settings }) });
    const result = await response.json();
    setStatus(response.ok ? "Published successfully." : result.error ?? "Could not save.");
  };
  return <div className="admin-page-editor">
    <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Text &amp; typography</p><h2>Page copy</h2></div></div><p className="admin-muted">Line breaks are preserved. Leave text size empty to use the page&apos;s responsive default.</p>
      <div className="admin-content-fields">{Object.entries(definition.texts).map(([key, entry]) => <div className="admin-content-field" key={key}><label>{entry[0]}<textarea value={settings.texts[key]?.value ?? ""} onChange={(event) => updateText(key, { value: event.target.value })} /></label><div><label>Font<select value={settings.texts[key]?.font ?? "serif"} onChange={(event) => updateText(key, { font: event.target.value as "serif" | "sans" | "display" })}><option value="serif">Serif</option><option value="sans">Sans serif</option><option value="display">Display</option></select></label><label>Text size<input value={settings.texts[key]?.size ?? ""} placeholder="e.g. 48px, 5vw" onChange={(event) => updateText(key, { size: event.target.value })} /></label></div></div>)}</div>
    </section>
    {Object.keys(definition.images).length > 0 && <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Photography</p><h2>Page images</h2></div></div><div className="admin-image-fields">{Object.entries(definition.images).map(([key, entry]) => <div key={key}><div className="admin-image-preview">{settings.images[key] ? <img src={settings.images[key]} alt="" /> : <span>No image</span>}</div><label className="admin-field">{entry[0]}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(key, file); }} /></label><label className="admin-field">Or paste an image URL<input value={settings.images[key] ?? ""} onChange={(event) => setSettings((current) => ({ ...current, images: { ...current.images, [key]: event.target.value } }))} /></label></div>)}</div></section>}
    <div className="admin-editor-save"><span role="status">{status}</span><a href={definition.path} target="_blank" rel="noreferrer">Preview ↗</a><button className="admin-primary-button" type="button" onClick={() => void save()}>Save &amp; publish</button></div>
  </div>;
}
