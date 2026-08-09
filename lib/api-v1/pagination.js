// lib/api-v1/pagination.js
//
// Cursor-based pagination for /api/v1 list endpoints, per #136's
// requirement for explicit default/max page size and invalid-cursor
// handling (added after review feedback on the original issue draft).
//
// Cursor design: opaque base64url-encoded JSON of { id, createdAt }, so
// sort order is stable even if two rows share a created_at timestamp
// (falls back to id as a tiebreaker). This avoids the classic
// offset-pagination bug where inserting/deleting rows mid-pagination
// skips or duplicates results.

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Manual base64url helpers rather than Buffer — these routes run on the
// edge runtime (Cloudflare Workers), where Buffer isn't reliably
// available. This mirrors the same technique already used in lib/auth.js
// (bytesToB64url/b64urlToBytes) for session cookie encoding, kept local
// here since those helpers aren't exported from that module.
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export class InvalidCursorError extends Error {
  constructor(message = 'Invalid pagination cursor') {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {{ limit: number, cursor: { id: string, createdAt: number } | null }}
 * @throws {InvalidCursorError}
 */
export function parsePagination(searchParams) {
  const rawLimit = searchParams.get('limit');
  let limit = DEFAULT_PAGE_SIZE;
  if (rawLimit !== null) {
    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new InvalidCursorError('limit must be a positive integer');
    }
    // Clamp rather than reject an over-large limit — a client asking for
    // 10000 gets MAX_PAGE_SIZE back, not an error; this is friendlier for
    // automation/agent clients probing bounds than a hard rejection.
    limit = Math.min(parsed, MAX_PAGE_SIZE);
  }

  const rawCursor = searchParams.get('cursor');
  let cursor = null;
  if (rawCursor) {
    try {
      const json = textDecoder.decode(b64urlToBytes(rawCursor));
      const parsed = JSON.parse(json);
      if (typeof parsed.id !== 'string' || typeof parsed.createdAt !== 'number') {
        throw new Error('malformed cursor payload');
      }
      cursor = parsed;
    } catch {
      throw new InvalidCursorError('cursor is malformed or expired');
    }
  }

  return { limit, cursor };
}

/**
 * @param {{ id: string, created_at: number }} row - the last row of the page
 */
export function encodeCursor(row) {
  const json = JSON.stringify({ id: row.id, createdAt: row.created_at });
  return bytesToB64url(textEncoder.encode(json));
}

export const PAGINATION_DEFAULTS = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
