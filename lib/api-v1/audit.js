// lib/api-v1/audit.js
//
// Emits one audit event per mutating /api/v1 request, per #136. Per the
// resolved design decision: this must NOT sit on the client-facing
// request path — the client response should not wait on this write.
//
// Uses the exact same waitUntil pattern already established in
// lib/cache.js (getRequestContext().ctx.waitUntil, with a fire-and-forget
// fallback for local dev where the Cloudflare request context isn't
// available), rather than inventing a different background-write
// mechanism for this one case.
//
// Deliberately metadata-only: no request/response payload contents are
// stored, per the "default to metadata-only unless a real need for
// payload capture is identified" resolution — only who/what/when/outcome.

/**
 * @param {{
 *   userId: string,
 *   requestId: string,
 *   method: string,
 *   endpoint: string,
 *   scopeUsed?: string,
 *   outcome: 'success' | 'error',
 *   statusCode: number,
 *   resourceId?: string,
 * }} event
 */
export async function recordAuditEvent(event) {
  const write = async () => {
    try {
      const { getDB } = await import('../cloudflare.js');
      const db = getDB();
      await db
        .prepare(
          `INSERT INTO api_audit_events
             (id, user_id, request_id, method, endpoint, scope_used, outcome, status_code, resource_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          event.userId,
          event.requestId,
          event.method,
          event.endpoint,
          event.scopeUsed || null,
          event.outcome,
          event.statusCode,
          event.resourceId || null,
        )
        .run();
    } catch {
      // A broken audit write must never break the primary request — this
      // mirrors the same intentional best-effort tolerance used for
      // analytics writes elsewhere in this repo (see app/api/blogs/*/route.js
      // analytics instrumentation, wrapped in bare try/catch for the same
      // reason: the public-facing feature must survive a broken migration
      // or transient DB issue on a secondary, non-critical write).
    }
  };

  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const ctx = getRequestContext().ctx;
    ctx.waitUntil(write());
  } catch {
    // Request context not available (local dev) — fire and forget, same
    // fallback used in lib/cache.js.
    write();
  }
}
