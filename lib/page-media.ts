const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

export function validatePageMedia(file: Pick<File, "type" | "size">, options: { video?: boolean; svg?: boolean } = {}) {
  const extension = imageExtensions[file.type]
    ?? (options.svg && file.type === "image/svg+xml" ? "svg" : undefined)
    ?? (options.video ? ({ "video/mp4": "mp4", "video/webm": "webm" } as Record<string, string>)[file.type] : undefined);
  if (!extension) return { error: "지원하지 않는 파일 형식입니다." } as const;
  const maxMB = file.type.startsWith("video/") ? 50 : 5;
  if (file.size > maxMB * 1024 * 1024) return { error: `파일은 ${maxMB}MB 이하여야 합니다.` } as const;
  return { extension } as const;
}

export const MAX_PAGE_GALLERY_IMAGES = 50;
