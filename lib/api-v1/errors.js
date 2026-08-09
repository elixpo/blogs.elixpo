// lib/api-v1/errors.js
//
// Shared error envelope for the /api/v1 bearer-token API, per #136:
// "Explicit schemas and consistent error envelopes" / "Machine-readable
// error codes and request IDs" (also required directly by #135's
// acceptance criteria).
//
// Every /api/v1 response — success or failure — carries an `x-request-id`
// header, and every error response uses the same JSON shape:
//   { error: { code, message }, requestId }

import { NextResponse } from 'next/server';

/**
 * Generates a request ID. Uses crypto.randomUUID (available in the edge
 * runtime) rather than inventing a custom ID scheme.
 */
export function generateRequestId() {
  return crypto.randomUUID();
}

/**
 * @param {string} code - machine-readable error code, e.g. "invalid_token",
 *   "insufficient_scope", "not_found", "conflict", "validation_error"
 * @param {string} message - human-readable description
 * @param {number} status - HTTP status code
 * @param {string} requestId
 * @param {object} [extra] - additional fields to merge into the error body
 *   (e.g. { current: {...} } for a 409 conflict response)
 */
export function apiError(code, message, status, requestId, extra = {}) {
  return NextResponse.json(
    { error: { code, message, ...extra }, requestId },
    { status, headers: { 'x-request-id': requestId } },
  );
}

/**
 * Wraps a successful response with the same requestId header convention,
 * so every /api/v1 response (success or failure) is traceable the same way.
 */
export function apiSuccess(body, { status = 200, requestId, headers = {} } = {}) {
  return NextResponse.json(body, {
    status,
    headers: { 'x-request-id': requestId, ...headers },
  });
}

// Standard error shortcuts matching the three-way rejection distinction
// from #136 (401 missing/invalid token, 403 wrong scope, 404 wrong tenant —
// so a caller can't tell from the response alone whether a resource exists
// if they're not authorized to know that).
export const errors = {
  invalidToken: (requestId, message = 'Missing or invalid access token') =>
    apiError('invalid_token', message, 401, requestId),
  insufficientScope: (requestId, message = 'Token lacks the required scope for this action') =>
    apiError('insufficient_scope', message, 403, requestId),
  notFound: (requestId, message = 'Resource not found') =>
    apiError('not_found', message, 404, requestId),
  validationError: (requestId, message) =>
    apiError('validation_error', message, 400, requestId),
  conflict: (requestId, message, current) =>
    apiError('conflict', message, 409, requestId, current ? { current } : {}),
  rateLimited: (requestId, message = 'Too many requests') =>
    apiError('rate_limited', message, 429, requestId),
  internal: (requestId, message = 'Internal server error') =>
    apiError('internal_error', message, 500, requestId),
};
