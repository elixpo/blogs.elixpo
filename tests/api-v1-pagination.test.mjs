import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePagination,
  encodeCursor,
  InvalidCursorError,
  PAGINATION_DEFAULTS,
} from '../lib/api-v1/pagination.js';

test('parsePagination: defaults to DEFAULT_PAGE_SIZE with no params', () => {
  const { limit, cursor } = parsePagination(new URLSearchParams());
  assert.equal(limit, PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE);
  assert.equal(cursor, null);
});

test('parsePagination: respects an explicit limit under the max', () => {
  const { limit } = parsePagination(new URLSearchParams('limit=5'));
  assert.equal(limit, 5);
});

test('parsePagination: clamps a limit above MAX_PAGE_SIZE rather than rejecting it', () => {
  const { limit } = parsePagination(new URLSearchParams('limit=99999'));
  assert.equal(limit, PAGINATION_DEFAULTS.MAX_PAGE_SIZE);
});

test('parsePagination: rejects a non-positive limit', () => {
  assert.throws(() => parsePagination(new URLSearchParams('limit=0')), InvalidCursorError);
  assert.throws(() => parsePagination(new URLSearchParams('limit=-5')), InvalidCursorError);
});

test('parsePagination: rejects a non-numeric limit', () => {
  assert.throws(() => parsePagination(new URLSearchParams('limit=abc')), InvalidCursorError);
});

test('encodeCursor + parsePagination round-trip correctly', () => {
  const row = { id: 'blog_123', created_at: 1700000000 };
  const encoded = encodeCursor(row);
  const { cursor } = parsePagination(new URLSearchParams(`cursor=${encoded}`));
  assert.equal(cursor.id, 'blog_123');
  assert.equal(cursor.createdAt, 1700000000);
});

test('parsePagination: rejects a malformed cursor rather than crashing', () => {
  assert.throws(
    () => parsePagination(new URLSearchParams('cursor=not-valid-base64url!!!')),
    InvalidCursorError,
  );
});

test('parsePagination: rejects a cursor that decodes to valid base64 but invalid JSON shape', () => {
  // Encodes {"foo":"bar"} — valid JSON, but missing id/createdAt.
  const badCursor = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url');
  assert.throws(() => parsePagination(new URLSearchParams(`cursor=${badCursor}`)), InvalidCursorError);
});
