import { Fragment } from "react";

const imageLine = /^!\[([^\]\r\n]*)\]\((https?:\/\/[^\s()]+)\)\r?$/gm;
const pageImagePath = /^\/storage\/v1\/object\/public\/page-images\/[0-9a-f-]{36}\.(webp|jpg|png)$/i;

function isPostImage(value: string) {
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!storageUrl) return false;
  try {
    const image = new URL(value);
    return image.origin === new URL(storageUrl).origin && pageImagePath.test(image.pathname) &&
      !image.username && !image.password && !image.search && !image.hash;
  } catch {
    return false;
  }
}

export function TextPostBody({ body }: { body: string }) {
  const pieces = [];
  let start = 0;
  for (const match of body.matchAll(imageLine)) {
    const [marker, alt, url] = match;
    if (!isPostImage(url)) continue;
    pieces.push(
      <Fragment key={match.index}>
        {body.slice(start, match.index).trimEnd()}
        {/* Supabase image files are already resized and compressed on upload. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} loading="lazy" decoding="async" className="my-6 h-auto max-w-full rounded-sm" />
      </Fragment>,
    );
    start = match.index + marker.length;
  }

  return (
    <div className="whitespace-pre-wrap break-words">
      {pieces}
      {start ? body.slice(start).trimStart() : body}
    </div>
  );
}
