const MAX_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function optimizeProductImage(file: File): Promise<File> {
  if (!MIME_TYPES.has(file.type)) throw new Error("JPEG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  if (file.size > MAX_BYTES) throw new Error("이미지는 10MB 이하만 업로드할 수 있습니다.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 최적화하지 못했습니다.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("이미지를 변환하지 못했습니다.")), "image/webp", 0.82));
    if (!MIME_TYPES.has(blob.type) || blob.size > MAX_BYTES) throw new Error("최적화된 이미지가 업로드 제한을 초과했습니다.");
    // Browsers without WebP encoding may return PNG instead.
    const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
    return new File([blob], `${crypto.randomUUID()}.${extension}`, { type: blob.type });
  } catch (error) {
    throw error instanceof Error ? error : new Error("이미지를 읽지 못했습니다.");
  } finally { URL.revokeObjectURL(url); }
}
