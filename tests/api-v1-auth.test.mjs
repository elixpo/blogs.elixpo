import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { verifyBearerToken, hasScope, KNOWN_SCOPES } from '../lib/api-v1/auth.js';

function makeRequest(headers = {}) {
  return { headers: { get: (name) => headers[name.toLowerCase()] ?? null } };
}

test('verifyBearerToken: returns null when no Authorization header is present', async () => {
  const result = await verifyBearerToken(makeRequest());
  assert.equal(result, null);
});

test('verifyBearerToken: returns null for a non-Bearer Authorization header', async () => {
  const result = await verifyBearerToken(makeRequest({ authorization: 'Basic abc123' }));
  assert.equal(result, null);
});

test('verifyBearerToken: returns null when accounts.elixpo rejects the token', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: false }));
  const result = await verifyBearerToken(makeRequest({ authorization: 'Bearer bad-token' }));
  assert.equal(result, null);
});

test('verifyBearerToken: returns null when accounts.elixpo is unreachable (network error)', async (t) => {
  t.mock.method(global, 'fetch', async () => {
    throw new Error('network down');
  });
  const result = await verifyBearerToken(makeRequest({ authorization: 'Bearer some-token' }));
  assert.equal(result, null);
});

test('verifyBearerToken: returns null when the response body has no sub/id', async (t) => {
  t.mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({ email: 'test@example.com' }),
  }));
  const result = await verifyBearerToken(makeRequest({ authorization: 'Bearer some-token' }));
  assert.equal(result, null);
});

test('verifyBearerToken: returns userId + placeholder scopes for a valid token without a scopes claim', async (t) => {
  t.mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({ sub: 'user_123' }),
  }));
  const result = await verifyBearerToken(makeRequest({ authorization: 'Bearer good-token' }));
  assert.equal(result.userId, 'user_123');
  assert.deepEqual(result.scopes, KNOWN_SCOPES);
});

test('verifyBearerToken: uses real scopes from the response when present', async (t) => {
  t.mock.method(global, 'fetch', async () => ({
    ok: true,
    json: async () => ({ sub: 'user_123', scopes: ['read'] }),
  }));
  const result = await verifyBearerToken(makeRequest({ authorization: 'Bearer good-token' }));
  assert.deepEqual(result.scopes, ['read']);
});

test('verifyBearerToken: passes the bearer token through to accounts.elixpo', async (t) => {
  let capturedHeaders;
  t.mock.method(global, 'fetch', async (_url, options) => {
    capturedHeaders = options.headers;
    return { ok: true, json: async () => ({ sub: 'user_123' }) };
  });
  await verifyBearerToken(makeRequest({ authorization: 'Bearer abc-xyz-123' }));
  assert.equal(capturedHeaders.Authorization, 'Bearer abc-xyz-123');
});

test('hasScope: checks membership correctly', () => {
  const auth = { scopes: ['read', 'draft'] };
  assert.equal(hasScope(auth, 'read'), true);
  assert.equal(hasScope(auth, 'publish'), false);
});
