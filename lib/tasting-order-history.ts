export type SavedTastingOrder = { id: string; token: string; savedAt: number };

export const TASTING_HISTORY_KEY = "casa-tasting-order-history-v1";
const LAST_ORDER_KEY = "tasting-last-order";
const MAX_ORDERS = 30;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOrders(value: string | null, now: number): SavedTastingOrder[] {
  if (!value) return [];
  try {
    const decoded: unknown = JSON.parse(value);
    if (!Array.isArray(decoded)) return [];
    return decoded.filter((entry): entry is SavedTastingOrder => {
      if (!entry || typeof entry !== "object") return false;
      const record = entry as Partial<SavedTastingOrder>;
      return typeof record.id === "string" && uuid.test(record.id)
        && typeof record.token === "string" && record.token.length >= 32 && record.token.length <= 256
        && typeof record.savedAt === "number" && Number.isFinite(record.savedAt)
        && record.savedAt > now - RETENTION_MS && record.savedAt <= now;
    });
  } catch { return []; }
}

function remember(entries: SavedTastingOrder[]): SavedTastingOrder[] {
  const unique = new Map<string, SavedTastingOrder>();
  for (const entry of [...entries].sort((a, b) => b.savedAt - a.savedAt)) {
    if (!unique.has(entry.id)) unique.set(entry.id, entry);
  }
  return [...unique.values()].slice(0, MAX_ORDERS);
}

/** Records on this device are retained for 30 days; signed-in orders live on the server. */
export function getSavedTastingOrders(): SavedTastingOrder[] {
  if (typeof window === "undefined") return [];
  const now = Date.now();
  let local: SavedTastingOrder[] = [], session: SavedTastingOrder[] = [];
  try { local = parseOrders(localStorage.getItem(TASTING_HISTORY_KEY), now); } catch {}
  try {
    session = parseOrders(sessionStorage.getItem(TASTING_HISTORY_KEY), now);
    const last: unknown = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null");
    if (last && typeof last === "object") {
      const record = last as Partial<SavedTastingOrder>;
      if (typeof record.id === "string" && uuid.test(record.id) && typeof record.token === "string" && record.token.length >= 32 && record.token.length <= 256) {
        const savedAt = typeof record.savedAt === "number" ? record.savedAt : now;
        if (savedAt > now - RETENTION_MS && savedAt <= now && !local.some((entry) => entry.id === record.id) && !session.some((entry) => entry.id === record.id)) {
          session.push({ id: record.id, token: record.token, savedAt });
          // Upgrade old last-order records once; never renew their expiry on reads.
          try { sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ id: record.id, token: record.token, savedAt })); } catch {}
        }
      }
    }
  } catch {}
  const merged = remember([...local, ...session]);
  // Migrate orders from the old tab-only history and expire records on read.
  try { localStorage.setItem(TASTING_HISTORY_KEY, JSON.stringify(merged)); } catch {}
  return merged;
}

export function saveTastingOrder(id: string, token: string) {
  if (typeof window === "undefined" || !uuid.test(id) || token.length < 32 || token.length > 256) return;
  const savedAt = Date.now();
  const next = remember([{ id, token, savedAt }, ...getSavedTastingOrders()]);
  try { localStorage.setItem(TASTING_HISTORY_KEY, JSON.stringify(next)); } catch {}
  try {
    sessionStorage.setItem(TASTING_HISTORY_KEY, JSON.stringify(next));
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ id, token, savedAt }));
  } catch {}
}

export function clearSavedTastingOrders() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(TASTING_HISTORY_KEY); } catch {}
  try {
    sessionStorage.removeItem(TASTING_HISTORY_KEY);
    sessionStorage.removeItem(LAST_ORDER_KEY);
  } catch {}
}
