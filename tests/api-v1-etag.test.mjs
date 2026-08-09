import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etagFor, isMatchingEtag } from '../lib/api-v1/etag.js';

test('etagFor: deterministic for the same id + updated_at', () => {
  const row = { id: 'blog_1', updated_at: 1700000000 };
  assert.equal(etagFor(row), etagFor({ ...row }));
});

test('etagFor: changes when updated_at changes', () => {
  const before = etagFor({ id: 'blog_1', updated_at: 1700000000 });
  const after = etagFor({ id: 'blog_1', updated_at: 1700000001 });
  assert.notEqual(before, after);
});

test('etagFor: changes when id changes, even with the same timestamp', () => {
  const a = etagFor({ id: 'blog_1', updated_at: 1700000000 });
  const b = etagFor({ id: 'blog_2', updated_at: 1700000000 });
  assert.notEqual(a, b);
});

test('isMatchingEtag: matches when If-Match equals the current ETag', () => {
  const etag = etagFor({ id: 'blog_1', updated_at: 1700000000 });
  assert.equal(isMatchingEtag(etag, etag), true);
});

test('isMatchingEtag: rejects when If-Match is stale (this is the core conflict-detection guarantee)', () => {
  const staleEtag = etagFor({ id: 'blog_1', updated_at: 1700000000 });
  const currentEtag = etagFor({ id: 'blog_1', updated_at: 1700000050 });
  assert.equal(isMatchingEtag(staleEtag, currentEtag), false);
});

test('isMatchingEtag: "*" always matches (RFC 7232 wildcard semantics)', () => {
  const currentEtag = etagFor({ id: 'blog_1', updated_at: 1700000000 });
  assert.equal(isMatchingEtag('*', currentEtag), true);
});

test('isMatchingEtag: rejects a missing If-Match header rather than defaulting to allow', () => {
  const currentEtag = etagFor({ id: 'blog_1', updated_at: 1700000000 });
  assert.equal(isMatchingEtag(null, currentEtag), false);
  assert.equal(isMatchingEtag(undefined, currentEtag), false);
  assert.equal(isMatchingEtag('', currentEtag), false);
});

test('isMatchingEtag: two concurrent editors — first succeeds, second is correctly rejected', () => {
  // Simulates the exact scenario #136's acceptance criteria describes:
  // "Concurrent edits return a conflict and [the server] preserve[s] both
  // revisions" — meaning neither is silently lost, not that both are
  // stored. Editor A and B both read the same original state.
  const original = { id: 'blog_1', updated_at: 1000 };
  const originalEtag = etagFor(original);

  // Editor A submits first — their If-Match (originalEtag) matches the
  // still-current state, so their edit is accepted, producing a new state.
  assert.equal(isMatchingEtag(originalEtag, etagFor(original)), true);
  const afterA = { id: 'blog_1', updated_at: 1005 };

  // Editor B submits second, still holding the ORIGINAL etag (they never
  // saw A's update) — their If-Match no longer matches the current state,
  // so their write is correctly rejected, preventing them from silently
  // clobbering Editor A's change.
  assert.equal(isMatchingEtag(originalEtag, etagFor(afterA)), false);
});
