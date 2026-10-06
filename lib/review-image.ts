export const REVIEW_IMAGE_MAX_EDGE = 1600;
export const REVIEW_IMAGE_TARGET_BYTES = 600 * 1024;
export const REVIEW_IMAGE_MAX_SOURCE_BYTES = 40 * 1024 * 1024;
export const REVIEW_IMAGE_MAX_PIXELS = 50_000_000;

export type OptimizedReviewImage = {
  file: File;
  width: number;
  height: number;
  originalSize: number;
};

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const acceptedExtension = /\.(jpe?g|png|webp|heic|heif)$/i;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("이미지를 WebP로 변환할 수 없습니다.")),
    "image/webp",
    quality,
  ));
}

async function decode(file: File) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
      ? "이 기기에서는 HEIC/HEIF 변환을 지원하지 않습니다. JPG 또는 PNG 이미지로 다시 업로드해주세요."
      : "이미지 파일을 읽을 수 없습니다.");
  }
}

/** Canvas re-encoding strips EXIF (including GPS), normalizes orientation and emits WebP. */
export async function optimizeReviewImage(file: File): Promise<OptimizedReviewImage> {
  const supportedMime = acceptedTypes.has(file.type);
  const supportedNameWithoutMime = !file.type && acceptedExtension.test(file.name);
  if (!supportedMime && !supportedNameWithoutMime) throw new Error("JPG, PNG, WEBP 또는 HEIC 이미지만 등록할 수 있습니다.");
  if (file.size > REVIEW_IMAGE_MAX_SOURCE_BYTES) throw new Error("이미지 원본은 한 장당 40MB 이하여야 합니다.");
  const bitmap = await decode(file);
  if (bitmap.width * bitmap.height > REVIEW_IMAGE_MAX_PIXELS) { bitmap.close(); throw new Error("이미지 해상도가 너무 큽니다. 5천만 픽셀 이하 이미지를 선택해주세요."); }
  let scale = Math.min(1, REVIEW_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) { bitmap.close(); throw new Error("이미지를 처리할 수 없습니다."); }
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  let blob = await canvasBlob(canvas, 0.78);
  if (blob.type !== "image/webp") throw new Error("이 브라우저에서는 WebP 변환을 지원하지 않습니다.");
  if (blob.size > REVIEW_IMAGE_TARGET_BYTES) blob = await canvasBlob(canvas, 0.7);
  if (blob.size > REVIEW_IMAGE_TARGET_BYTES && Math.max(width, height) > 1400) {
    const reduced = document.createElement("canvas");
    scale = 1400 / Math.max(width, height); width = Math.round(width * scale); height = Math.round(height * scale);
    reduced.width = width; reduced.height = height;
    reduced.getContext("2d", { alpha: true })?.drawImage(canvas, 0, 0, width, height);
    blob = await canvasBlob(reduced, 0.7);
  }
  return { file: new File([blob], `${crypto.randomUUID()}.webp`, { type: "image/webp" }), width, height, originalSize: file.size };
}
