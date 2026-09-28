import type { ElementType } from "react";
import type { TextSetting } from "@/lib/page-content-config";

export function PageText({ setting, as: Tag = "span", className = "" }: { setting: TextSetting; as?: ElementType; className?: string }) {
  const fonts = { inherit: undefined, serif: 'Georgia, "Times New Roman", serif', sans: '"Avenir Next", "Helvetica Neue", Arial, sans-serif', display: 'Impact, "Arial Narrow", sans-serif' };
  const content = setting.value.split(/(\*[^*]+\*)/g).map((part, index) => part.startsWith("*") && part.endsWith("*") ? <i key={index}>{part.slice(1, -1)}</i> : part);
  return <Tag className={className} style={{ fontFamily: fonts[setting.font] ?? undefined, fontSize: setting.size || undefined, whiteSpace: "pre-line" }}>{content}</Tag>;
}
