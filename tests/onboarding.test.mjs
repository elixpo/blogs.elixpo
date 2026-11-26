import test from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath, uniqueAuthors } from '../src/utils/onboarding.js';

test('safeNextPath keeps same-site paths and rejects everything else', () => {
  assert.equal(safeNextPath('/explore?tab=new'), '/explore?tab=new');
  for (const bad of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'explore', '/intro', '/intro?next=/x']) {
    assert.equal(safeNextPath(bad), '/', String(bad));
  }
});

test('uniqueAuthors dedupes, skips the viewer and anonymous posts, and limits', () => {
  const posts = [
    { author: { username: 'ana', display_name: 'Ana' } },
    { author: { username: 'ana', display_name: 'Ana' } },
    { author: { username: null, display_name: 'Anonymous' } },
    { author: { username: 'me' } },
    { author: { username: 'unknown' } },
    { author: { username: 'bob', avatar_url: 'b.png' } },
    { author: { username: 'cy' } },
  ];
  assert.deepEqual(uniqueAuthors(posts, 'me').map((a) => a.username), ['ana', 'bob', 'cy']);
  assert.deepEqual(uniqueAuthors(posts, 'me', 2).map((a) => a.username), ['ana', 'bob']);
  assert.deepEqual(uniqueAuthors(null, 'me'), []);
});
