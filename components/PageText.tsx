import type { ElementType } from "react";
import type { TextSetting } from "@/lib/page-content-config";

export function PageText({ setting, as: Tag = "span", className = "" }: { setting: TextSetting; as?: ElementType; className?: string }) {
  const font = setting.font === "sans" ? '"Avenir Next", "Helvetica Neue", Arial, sans-serif' : setting.font === "display" ? 'Impact, "Arial Narrow", sans-serif' : 'Georgia, "Times New Roman", serif';
  return <Tag className={className} style={{ fontFamily: font, fontSize: setting.size || undefined, whiteSpace: "pre-line" }}>{setting.value}</Tag>;
}
