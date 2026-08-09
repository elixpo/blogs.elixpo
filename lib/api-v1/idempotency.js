// lib/api-v1/idempotency.js
//
// Idempotency-Key support for create/publish/upload endpoints, per #135/
// #136. Behavior: same key + same request body -> return the original
// cached response. Same key + different body -> 409 (a client bug or key
// collision, not a legitimate retry). Keys expire after
// IDEMPOTENCY_KEY_TTL_SECONDS; expired rows are cleaned up lazily by
// cleanupExpiredIdempotencyKeys(), not by a separate cron in this first
// slice.

// 24h TTL — matches common practice for idempotency keys (e.g. Stripe's
// default), long enough to cover realistic retry windows (a flaky network
// retried minutes to hours later) without the table growing unbounded.
export const IDEMPOTENCY_KEY_TTL_SECONDS = 24 * 60 * 60;

async function hashRequestBody(bodyText) {
  const data = new TextEncoder().encode(bodyText);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {object} db - D1 database instance
 * @param {{ userId: string, endpoint: string, idempotencyKey: string, bodyText: string }} params
 * @returns {Promise<
 *   | { status: 'new' }
 *   | { status: 'replay', responseStatus: number, responseBody: object }
 *   | { status: 'conflict' }
 * >}
 */
export async function checkIdempotencyKey(db, { userId, endpoint, idempotencyKey, bodyText }) {
  const bodyHash = await hashRequestBody(bodyText);

  const existing = await db
    .prepare(
      `SELECT request_body_hash, response_status, response_body, expires_at
       FROM api_idempotency_keys
       WHERE user_id = ? AND endpoint = ? AND idempotency_key = ?`,
    )
    .bind(userId, endpoint, idempotencyKey)
    .first();

  if (!existing) {
    return { status: 'new' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (existing.expires_at <= nowSeconds) {
    // Expired — treat as if it never existed. The stale row gets
    // overwritten by storeIdempotencyResult's INSERT OR REPLACE.
    return { status: 'new' };
  }

  if (existing.request_body_hash !== bodyHash) {
    return { status: 'conflict' };
  }

  return {
    status: 'replay',
    responseStatus: existing.response_status,
    responseBody: JSON.parse(existing.response_body),
  };
}

/**
 * @param {object} db
 * @param {{ userId: string, endpoint: string, idempotencyKey: string, bodyText: string, responseStatus: number, responseBody: object }} params
 */
export async function storeIdempotencyResult(
  db,
  { userId, endpoint, idempotencyKey, bodyText, responseStatus, responseBody },
) {
  const bodyHash = await hashRequestBody(bodyText);
  const nowSeconds = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT OR REPLACE INTO api_idempotency_keys
         (id, idempotency_key, user_id, endpoint, request_body_hash, response_status, response_body, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      idempotencyKey,
      userId,
      endpoint,
      bodyHash,
      responseStatus,
      JSON.stringify(responseBody),
      nowSeconds,
      nowSeconds + IDEMPOTENCY_KEY_TTL_SECONDS,
    )
    .run();
}

/**
 * Lazily deletes expired keys. Called opportunistically (e.g. at the top
 * of the create endpoint) rather than via a separate scheduled job in
 * this first slice — cheap since it's indexed on expires_at, and bounds
 * table growth without needing new infra.
 */
export async function cleanupExpiredIdempotencyKeys(db) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  await db.prepare(`DELETE FROM api_idempotency_keys WHERE expires_at <= ?`).bind(nowSeconds).run();
}
