import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCanonicalUrl } from '../lib/canonicalUrl.js';

test('accepts external http(s) URLs and drops the fragment', () => {
  assert.deepEqual(normalizeCanonicalUrl(' https://ana.dev/posts/itp?ref=1#top '), {
    ok: true, value: 'https://ana.dev/posts/itp?ref=1',
  });
  assert.deepEqual(normalizeCanonicalUrl('http://example.org/a'), { ok: true, value: 'http://example.org/a' });
});

test('empty input or a LixBlogs URL means no override', () => {
  for (const value of [undefined, null, '', '   ', 'https://blogs.elixpo.com/ana/post', 'https://BLOGS.elixpo.com/x']) {
    assert.deepEqual(normalizeCanonicalUrl(value), { ok: true, value: null }, String(value));
  }
});

test('rejects non-URLs, other schemes, credentials, bare hosts and huge input', () => {
  for (const value of ['ana.dev/post', 'javascript:alert(1)', 'ftp://x.org/a', 'https://u:p@x.org/a', 'https://localhost/a', `https://x.org/${'a'.repeat(2100)}`, 42]) {
    assert.equal(normalizeCanonicalUrl(value).ok, false, String(value).slice(0, 40));
  }
});
