export type TextPost = {
  id: string;
  title: string;
  summary: string;
  body: string;
  published_at: string | null;
  updated_at: string;
};

export function isTextPostId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function formatTextPostDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
