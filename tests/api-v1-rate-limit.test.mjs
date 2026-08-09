import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, rateLimitHeaders } from '../lib/api-v1/rateLimit.js';

function makeFakeKv() {
  const store = new Map();
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

test('checkRateLimit: first request in a window is allowed with remaining = limit - 1', async () => {
  const kv = makeFakeKv();
  const result = await checkRateLimit('user_1', 'GET /api/v1/blogs', 5, kv);
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 4);
});

test('checkRateLimit: increments correctly across repeated calls within the same window', async () => {
  const kv = makeFakeKv();
  await checkRateLimit('user_1', 'GET /api/v1/blogs', 3, kv);
  await checkRateLimit('user_1', 'GET /api/v1/blogs', 3, kv);
  const third = await checkRateLimit('user_1', 'GET /api/v1/blogs', 3, kv);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);
});

test('checkRateLimit: rejects once the limit is exceeded within the same window', async () => {
  const kv = makeFakeKv();
  await checkRateLimit('user_1', 'GET /api/v1/blogs', 2, kv);
  await checkRateLimit('user_1', 'GET /api/v1/blogs', 2, kv);
  const third = await checkRateLimit('user_1', 'GET /api/v1/blogs', 2, kv);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test('checkRateLimit: different users have independent counters', async () => {
  const kv = makeFakeKv();
  await checkRateLimit('user_1', 'GET /api/v1/blogs', 1, kv);
  const otherUser = await checkRateLimit('user_2', 'GET /api/v1/blogs', 1, kv);
  assert.equal(otherUser.allowed, true);
});

test('checkRateLimit: different endpoints have independent counters for the same user', async () => {
  const kv = makeFakeKv();
  await checkRateLimit('user_1', 'GET /api/v1/blogs', 1, kv);
  const otherEndpoint = await checkRateLimit('user_1', 'PATCH /api/v1/blogs/:id', 1, kv);
  assert.equal(otherEndpoint.allowed, true);
});

// No real Cloudflare KV binding exists in this test environment, so
// checkRateLimit's internal getKV() import fails and it falls back to
// "fail open" (allowed: true) by design — see the module's doc comment.
// This test confirms that specific, intentional behavior when no KV
// override is supplied.

test('checkRateLimit: fails open (allows the request) when no KV binding is available', async () => {
  const result = await checkRateLimit('user_1', 'GET /api/v1/blogs');
  assert.equal(result.allowed, true);
  assert.ok(result.limit > 0);
  assert.ok(result.resetAt > Math.floor(Date.now() / 1000));
});

test('rateLimitHeaders: formats all three standard headers as strings', () => {
  const headers = rateLimitHeaders({ limit: 60, remaining: 42, resetAt: 1700000060 });
  assert.equal(headers['x-ratelimit-limit'], '60');
  assert.equal(headers['x-ratelimit-remaining'], '42');
  assert.equal(headers['x-ratelimit-reset'], '1700000060');
});

test('rateLimitHeaders: clamps a negative remaining to 0 rather than showing a negative number', () => {
  const headers = rateLimitHeaders({ limit: 60, remaining: -5, resetAt: 1700000060 });
  assert.equal(headers['x-ratelimit-remaining'], '0');
});
