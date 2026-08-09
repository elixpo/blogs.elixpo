// lib/api-v1/rateLimit.js
//
// Per-user, per-endpoint rate limiting for /api/v1, per #136 ("Pagination,
// rate-limit headers, idempotency, ETag/revision conflict responses, and
// audit events"). Implemented as a fixed-window counter in KV, reusing
// this repo's existing getKV() access pattern (see lib/cache.js) rather
// than adding a new storage mechanism. Chose KV over D1 for this
// specifically because it's a high-frequency, low-value-per-write counter
// — exactly the kind of access pattern KV suits better than D1's
// per-request query cost.
//
// Deliberately a simple fixed window, not a sliding window or token
// bucket — fixed windows allow a burst at the window boundary (e.g. a
// client could send limit*2 requests within 2 seconds around a window
// edge), which is a known, accepted tradeoff for the simplicity and single
// KV read+write per request it buys. Worth revisiting if abuse patterns
// actually exploit the boundary in practice.

const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT_PER_WINDOW = 60; // 1 req/sec sustained, generous burst within a window

/**
 * @param {string} userId
 * @param {string} endpoint - e.g. "GET /api/v1/blogs"
 * @param {number} [limit]
 * @param {{ get: (key: string) => Promise<string|null>, put: (key: string, value: string, opts?: object) => Promise<void> } | null} [kvOverride]
 *   Injectable KV-like store, primarily for tests. When omitted, resolves
 *   the real Cloudflare KV binding via getKV().
 * @returns {Promise<{ allowed: boolean, limit: number, remaining: number, resetAt: number }>}
 */
export async function checkRateLimit(userId, endpoint, limit = DEFAULT_LIMIT_PER_WINDOW, kvOverride = undefined) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / WINDOW_SECONDS) * WINDOW_SECONDS;
  const resetAt = windowStart + WINDOW_SECONDS;
  const key = `ratelimit:${userId}:${endpoint}:${windowStart}`;

  let kv = kvOverride;
  if (kv === undefined) {
    try {
      const { getKV } = await import('../cloudflare.js');
      kv = getKV();
    } catch {
      // No KV binding available (e.g. local dev without Cloudflare context)
      // — fail open rather than blocking every request in dev. This mirrors
      // the same "local dev fallback" tolerance already used in
      // lib/cache.js for waitUntil.
      return { allowed: true, limit, remaining: limit, resetAt };
    }
  }

  const currentRaw = await kv.get(key);
  const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;

  if (current >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt };
  }

  // Best-effort increment — a lost increment under a race just means a
  // slightly generous window, not a security hole (this is abuse
  // mitigation, not a hard security boundary).
  await kv.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS + 5 });

  return { allowed: true, limit, remaining: limit - current - 1, resetAt };
}

/**
 * @param {{ limit: number, remaining: number, resetAt: number }} result
 * @returns {Record<string, string>}
 */
export function rateLimitHeaders(result) {
  return {
    'x-ratelimit-limit': String(result.limit),
    'x-ratelimit-remaining': String(Math.max(0, result.remaining)),
    'x-ratelimit-reset': String(result.resetAt),
  };
}
