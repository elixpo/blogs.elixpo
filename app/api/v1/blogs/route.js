export const runtime = 'edge';

// GET /api/v1/blogs — list the caller's own blogs.
//
// This is deliberately the first and smallest real endpoint on the new
// /api/v1 surface, per #136's own notes: prove the whole contract (auth,
// scopes, error envelope, pagination) on a small read-only endpoint before
// building out create/edit/publish. Ownership scoping here is
// "blogs authored by the caller" only — co-author and organization scoping
// are real requirements from #136 but are follow-up work once this proves
// out, not implemented in this first slice.

import { verifyBearerToken, hasScope } from '../../../../lib/api-v1/auth.js';
import { generateRequestId, errors, apiSuccess } from '../../../../lib/api-v1/errors.js';
import { parsePagination, encodeCursor, InvalidCursorError } from '../../../../lib/api-v1/pagination.js';
import { checkRateLimit, rateLimitHeaders } from '../../../../lib/api-v1/rateLimit.js';

const ENDPOINT_NAME = 'GET /api/v1/blogs';

export async function GET(request) {
  const requestId = generateRequestId();

  const auth = await verifyBearerToken(request);
  if (!auth) {
    return errors.invalidToken(requestId);
  }

  if (!hasScope(auth, 'read')) {
    return errors.insufficientScope(requestId);
  }

  const rateLimit = await checkRateLimit(auth.userId, ENDPOINT_NAME);
  if (!rateLimit.allowed) {
    const res = errors.rateLimited(requestId);
    for (const [k, v] of Object.entries(rateLimitHeaders(rateLimit))) res.headers.set(k, v);
    return res;
  }

  const { searchParams } = new URL(request.url);

  let limit, cursor;
  try {
    ({ limit, cursor } = parsePagination(searchParams));
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      return errors.validationError(requestId, err.message);
    }
    throw err;
  }

  const status = searchParams.get('status'); // 'draft' | 'published' | null (all)
  if (status && !['draft', 'published', 'unlisted'].includes(status)) {
    return errors.validationError(requestId, 'status must be one of: draft, published, unlisted');
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare.js');
    const db = getDB();

    const conditions = ['b.author_id = ?'];
    const bindings = [auth.userId];

    if (status) {
      conditions.push('b.status = ?');
      bindings.push(status);
    }

    // Cursor: fetch rows strictly after (created_at, id) of the cursor,
    // ordered the same way, so pagination is stable under concurrent
    // inserts/deletes — not a fragile OFFSET.
    if (cursor) {
      conditions.push('(b.created_at < ? OR (b.created_at = ? AND b.id < ?))');
      bindings.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    const whereClause = conditions.join(' AND ');

    // Fetch one extra row to know whether there's a next page, without a
    // separate COUNT query.
    const rows = await db
      .prepare(
        `SELECT b.id, b.slug, b.title, b.subtitle, b.status, b.page_emoji,
                b.read_time_minutes, b.created_at, b.updated_at, b.published_at
         FROM blogs b
         WHERE ${whereClause}
         ORDER BY b.created_at DESC, b.id DESC
         LIMIT ?`,
      )
      .bind(...bindings, limit + 1)
      .all();

    const results = rows?.results || [];
    const hasMore = results.length > limit;
    const page = hasMore ? results.slice(0, limit) : results;

    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

    return apiSuccess(
      {
        blogs: page.map((b) => ({
          id: b.id,
          slug: b.slug,
          title: b.title,
          subtitle: b.subtitle,
          status: b.status,
          emoji: b.page_emoji,
          readTimeMinutes: b.read_time_minutes,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          publishedAt: b.published_at,
        })),
        pagination: { nextCursor, hasMore },
      },
      { requestId, headers: rateLimitHeaders(rateLimit) },
    );
  } catch (err) {
    console.error('[api/v1/blogs] list error:', err);
    return errors.internal(requestId);
  }
}
