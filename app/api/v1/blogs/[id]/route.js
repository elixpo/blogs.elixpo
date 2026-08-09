export const runtime = 'edge';

// GET/PATCH /api/v1/blogs/:id
//
// Proves the ETag/If-Match concurrency contract from #136 on the smallest
// real resource. Per the reviewed spec: the ETag is derived from the
// existing `updated_at` column (not a new invented storage field), and a
// conflicting PATCH is rejected outright with 409 — the server never
// stores or attempts to reconcile the losing payload; the 409 response
// includes the current resource and its current ETag so the client can
// re-fetch, re-apply their change, and retry.
//
// Authorization: reuses lib/permissions.js's canEditBlog (owner, org
// admin/maintain/write member, or accepted co-author with editor/admin
// role) for BOTH read and write here. This repo has no separate
// read-only permission helper — a co-author with only the 'viewer' role
// technically should be able to read but not edit, and this endpoint
// currently doesn't distinguish that case for GET. Flagging as a known
// simplification rather than silently reusing an edit-scoped check for
// reads without saying so; worth a real canViewBlog helper as a follow-up
// if the CLI needs finer-grained read access than this.

import { verifyBearerToken, hasScope } from '../../../../../lib/api-v1/auth.js';
import { generateRequestId, errors, apiSuccess } from '../../../../../lib/api-v1/errors.js';
import { etagFor, isMatchingEtag } from '../../../../../lib/api-v1/etag.js';
import { checkRateLimit, rateLimitHeaders } from '../../../../../lib/api-v1/rateLimit.js';
import {
  requestTooLarge,
  byteLength,
  MAX_BLOG_CONTENT_BYTES,
  MAX_TITLE_LEN,
  MAX_SUBTITLE_LEN,
} from '../../../../../lib/limits.js';

function serializeBlog(b) {
  return {
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
  };
}

async function loadBlog(db, id) {
  return db
    .prepare(
      `SELECT id, slug, title, subtitle, content, status, page_emoji,
              read_time_minutes, author_id, created_at, updated_at, published_at
       FROM blogs WHERE id = ?`,
    )
    .bind(id)
    .first();
}

export async function GET(request, { params }) {
  const requestId = generateRequestId();
  const { id } = await params;

  const auth = await verifyBearerToken(request);
  if (!auth) return errors.invalidToken(requestId);
  if (!hasScope(auth, 'read')) return errors.insufficientScope(requestId);

  const rateLimit = await checkRateLimit(auth.userId, 'GET /api/v1/blogs/:id');
  if (!rateLimit.allowed) {
    const res = errors.rateLimited(requestId);
    for (const [k, v] of Object.entries(rateLimitHeaders(rateLimit))) res.headers.set(k, v);
    return res;
  }

  try {
    const { getDB } = await import('../../../../../lib/cloudflare.js');
    const { canEditBlog } = await import('../../../../../lib/permissions.js');
    const db = getDB();

    const perm = await canEditBlog(db, id, auth.userId);
    // Per the 401/403/404 distinction from #136's review: a valid token
    // with the right scope, but for someone else's resource, gets a plain
    // 404 — not a 403 — so the response doesn't confirm to an
    // unauthorized caller that the resource exists at all.
    if (!perm.ok) {
      return errors.notFound(requestId, `No blog with id "${id}"`);
    }

    const blog = await loadBlog(db, id);
    if (!blog) {
      return errors.notFound(requestId, `No blog with id "${id}"`);
    }

    return apiSuccess(
      { blog: serializeBlog(blog) },
      { requestId, headers: { ETag: etagFor(blog), ...rateLimitHeaders(rateLimit) } },
    );
  } catch (err) {
    console.error('[api/v1/blogs/:id] get error:', err);
    return errors.internal(requestId);
  }
}

export async function PATCH(request, { params }) {
  const requestId = generateRequestId();
  const { id } = await params;

  const auth = await verifyBearerToken(request);
  if (!auth) return errors.invalidToken(requestId);
  if (!hasScope(auth, 'draft')) return errors.insufficientScope(requestId);

  const rateLimit = await checkRateLimit(auth.userId, 'PATCH /api/v1/blogs/:id');
  if (!rateLimit.allowed) {
    const res = errors.rateLimited(requestId);
    for (const [k, v] of Object.entries(rateLimitHeaders(rateLimit))) res.headers.set(k, v);
    return res;
  }

  if (requestTooLarge(request)) {
    return errors.validationError(requestId, 'Request body too large');
  }

  const ifMatch = request.headers.get('if-match');
  if (!ifMatch) {
    return errors.validationError(requestId, 'If-Match header is required for edits');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errors.validationError(requestId, 'Request body must be valid JSON');
  }

  const allowedFields = ['title', 'subtitle', 'content'];
  const updates = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) {
    return errors.validationError(
      requestId,
      `Request body must include at least one of: ${allowedFields.join(', ')}`,
    );
  }

  // Same size/length limits enforced everywhere else content is written
  // (see app/api/blogs/draft/route.js) — matching them here, not inventing
  // separate bounds for the CLI/API path.
  if ('title' in updates && updates.title != null && updates.title.length > MAX_TITLE_LEN) {
    return errors.validationError(requestId, `title must be ${MAX_TITLE_LEN} characters or fewer`);
  }
  if (
    'subtitle' in updates &&
    updates.subtitle != null &&
    updates.subtitle.length > MAX_SUBTITLE_LEN
  ) {
    return errors.validationError(
      requestId,
      `subtitle must be ${MAX_SUBTITLE_LEN} characters or fewer`,
    );
  }
  if ('content' in updates && byteLength(updates.content) > MAX_BLOG_CONTENT_BYTES) {
    return errors.validationError(requestId, 'content exceeds the maximum allowed size');
  }

  try {
    const { getDB } = await import('../../../../../lib/cloudflare.js');
    const { canEditBlog } = await import('../../../../../lib/permissions.js');
    const db = getDB();

    const perm = await canEditBlog(db, id, auth.userId);
    if (!perm.ok) {
      return errors.notFound(requestId, `No blog with id "${id}"`);
    }

    const current = await loadBlog(db, id);
    if (!current) {
      return errors.notFound(requestId, `No blog with id "${id}"`);
    }

    const currentEtag = etagFor(current);
    if (!isMatchingEtag(ifMatch, currentEtag)) {
      // Reject outright — do NOT store or merge the incoming payload. The
      // client is expected to re-fetch, re-apply their edit against the
      // current version, and retry.
      return errors.conflict(
        requestId,
        'The resource has changed since it was last fetched. Re-fetch and retry.',
        serializeBlog(current),
      );
    }

    // Matches this repo's existing convention (see app/api/blogs/draft/route.js):
    // updated_at is unixepoch() seconds, not Date.now() milliseconds.
    const nowSeconds = Math.floor(Date.now() / 1000);

    if ('content' in updates) {
      const { compressBlogContent } = await import('../../../../../lib/compress.js');
      updates.content = updates.content ? compressBlogContent(updates.content) : '';
    }

    const setClauses = Object.keys(updates)
      .map((field) => `${field} = ?`)
      .join(', ');
    const bindings = [...Object.values(updates), nowSeconds, id];

    await db
      .prepare(`UPDATE blogs SET ${setClauses}, updated_at = ? WHERE id = ?`)
      .bind(...bindings)
      .run();

    const updated = await loadBlog(db, id);

    return apiSuccess(
      { blog: serializeBlog(updated) },
      { requestId, headers: { ETag: etagFor(updated), ...rateLimitHeaders(rateLimit) } },
    );
  } catch (err) {
    console.error('[api/v1/blogs/:id] patch error:', err);
    return errors.internal(requestId);
  }
}
