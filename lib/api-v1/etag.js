// lib/api-v1/etag.js
//
// Pure ETag generation and If-Match comparison logic, extracted out of the
// route handler so the actual concurrency-safety logic has real unit
// tests, independent of mocking the DB/Next.js runtime. This is
// deliberately the part of #136's contract most worth testing directly —
// getting this wrong either lets a client silently overwrite someone
// else's edit, or wrongly rejects a legitimate first edit.

/**
 * @param {{ id: string, updated_at: number }} row
 * @returns {string} a weak ETag derived from id + updated_at (seconds).
 *   Weak (content-derived-by-timestamp) rather than a byte hash of the
 *   full row — sufficient for optimistic concurrency, where we only need
 *   "has this changed since I read it", not content addressing.
 */
export function etagFor(row) {
  return `W/"${row.id}-${row.updated_at}"`;
}

/**
 * @param {string | null} ifMatchHeader - the raw If-Match header value
 * @param {string} currentEtag - the current resource's real ETag
 * @returns {boolean} true if the request's If-Match is satisfied by the
 *   current state (i.e. the edit may proceed)
 */
export function isMatchingEtag(ifMatchHeader, currentEtag) {
  if (!ifMatchHeader) return false;
  // '*' means "apply regardless of current state, as long as the resource
  // exists" per RFC 7232 §3.1 — a legitimate, intentional bypass, not a
  // loophole.
  if (ifMatchHeader === '*') return true;
  return ifMatchHeader === currentEtag;
}
