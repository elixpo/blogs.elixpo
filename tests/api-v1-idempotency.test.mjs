import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkIdempotencyKey,
  storeIdempotencyResult,
  cleanupExpiredIdempotencyKeys,
  IDEMPOTENCY_KEY_TTL_SECONDS,
} from '../lib/api-v1/idempotency.js';

// Minimal fake D1 — enough to exercise the real SQL-shaped logic without
// needing an actual Cloudflare D1 binding. Stores rows in memory, keyed
// the same way the real UNIQUE index constrains them.
function makeFakeDb() {
  const rows = new Map();
  const keyFor = (userId, endpoint, idempotencyKey) => `${userId}::${endpoint}::${idempotencyKey}`;

  return {
    prepare(sql) {
      const isSelect = sql.trim().startsWith('SELECT');
      const isInsert = sql.trim().startsWith('INSERT');
      const isDelete = sql.trim().startsWith('DELETE');
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async first() {
          if (!isSelect) throw new Error('first() called on non-SELECT');
          const [userId, endpoint, idempotencyKey] = bound;
          return rows.get(keyFor(userId, endpoint, idempotencyKey)) || null;
        },
        async run() {
          if (isInsert) {
            const [
              id,
              idempotencyKey,
              userId,
              endpoint,
              request_body_hash,
              response_status,
              response_body,
              created_at,
              expires_at,
            ] = bound;
            rows.set(keyFor(userId, endpoint, idempotencyKey), {
              request_body_hash,
              response_status,
              response_body,
              expires_at,
            });
          } else if (isDelete) {
            const [cutoff] = bound;
            for (const [k, v] of rows.entries()) {
              if (v.expires_at <= cutoff) rows.delete(k);
            }
          }
          return { success: true };
        },
      };
    },
  };
}

test('checkIdempotencyKey: returns "new" when no prior record exists', async () => {
  const db = makeFakeDb();
  const result = await checkIdempotencyKey(db, {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'key-1',
    bodyText: '{"title":"Hello"}',
  });
  assert.equal(result.status, 'new');
});

test('storeIdempotencyResult + checkIdempotencyKey: same key + same body replays the cached response', async () => {
  const db = makeFakeDb();
  const params = {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'key-1',
    bodyText: '{"title":"Hello"}',
  };

  await storeIdempotencyResult(db, {
    ...params,
    responseStatus: 201,
    responseBody: { blog: { id: 'blog_1' } },
  });

  const result = await checkIdempotencyKey(db, params);
  assert.equal(result.status, 'replay');
  assert.equal(result.responseStatus, 201);
  assert.deepEqual(result.responseBody, { blog: { id: 'blog_1' } });
});

test('checkIdempotencyKey: same key + DIFFERENT body is a conflict, not a replay', async () => {
  const db = makeFakeDb();
  await storeIdempotencyResult(db, {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'key-1',
    bodyText: '{"title":"Hello"}',
    responseStatus: 201,
    responseBody: { blog: { id: 'blog_1' } },
  });

  const result = await checkIdempotencyKey(db, {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'key-1',
    bodyText: '{"title":"Something completely different"}',
  });
  assert.equal(result.status, 'conflict');
});

test('checkIdempotencyKey: same key is scoped per user — another user\'s identical key is independent', async () => {
  const db = makeFakeDb();
  await storeIdempotencyResult(db, {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'key-1',
    bodyText: '{"title":"Hello"}',
    responseStatus: 201,
    responseBody: { blog: { id: 'blog_1' } },
  });

  const result = await checkIdempotencyKey(db, {
    userId: 'u2',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'key-1',
    bodyText: '{"title":"Hello"}',
  });
  assert.equal(result.status, 'new');
});

test('checkIdempotencyKey: an expired key is treated as if it never existed', async () => {
  const db = makeFakeDb();
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Manually insert an already-expired row (expires_at in the past).
  await db
    .prepare(
      `INSERT INTO api_idempotency_keys (id, idempotency_key, user_id, endpoint, request_body_hash, response_status, response_body, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      'row1',
      'key-1',
      'u1',
      'POST /api/v1/blogs',
      'some-hash',
      201,
      '{}',
      nowSeconds - 100000,
      nowSeconds - 1, // already expired
    )
    .run();

  const result = await checkIdempotencyKey(db, {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'key-1',
    bodyText: '{"title":"Hello"}',
  });
  assert.equal(result.status, 'new');
});

test('cleanupExpiredIdempotencyKeys: removes only expired rows', async () => {
  const db = makeFakeDb();
  const nowSeconds = Math.floor(Date.now() / 1000);

  await storeIdempotencyResult(db, {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'still-valid',
    bodyText: '{}',
    responseStatus: 201,
    responseBody: {},
  });

  await cleanupExpiredIdempotencyKeys(db);

  const stillThere = await checkIdempotencyKey(db, {
    userId: 'u1',
    endpoint: 'POST /api/v1/blogs',
    idempotencyKey: 'still-valid',
    bodyText: '{}',
  });
  assert.equal(stillThere.status, 'replay'); // wasn't cleaned up, still valid
});

test('IDEMPOTENCY_KEY_TTL_SECONDS is exactly 24 hours', () => {
  assert.equal(IDEMPOTENCY_KEY_TTL_SECONDS, 24 * 60 * 60);
});
