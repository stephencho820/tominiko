import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export const hashAccessToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function tokenMatches(token: string | null, expectedHash: string | null) {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashAccessToken(token));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
