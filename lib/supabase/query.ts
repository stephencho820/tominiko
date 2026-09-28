const SUPABASE_QUERY_TIMEOUT_MS = 4_000;

/**
 * Keep public pages responsive when Supabase is temporarily unreachable.
 * PostgREST queries otherwise inherit the platform fetch timeout, which can
 * leave an entire server-rendered page waiting for tens of seconds.
 */
export async function runSupabaseQuery<T>(
  query: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_QUERY_TIMEOUT_MS);

  try {
    return await query(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}
