import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TAGS, suggestTagsForTitle } from '../src/utils/tagSuggestions.js';

const popular = [
  { tag: 'debian', count: 40 },
  { tag: 'linux', count: 90 },
  { tag: 'machine-learning', count: 30 },
  { tag: 'c++', count: 12 },
  { tag: 'design', count: 50 },
];

test('suggests popular tags whose words appear in the title, most-used first', () => {
  assert.deepEqual(
    suggestTagsForTitle('From ITP to Debian testing on Linux', popular),
    ['linux', 'debian'],
  );
});

test('multi-word and symbol tags match on all their words', () => {
  assert.deepEqual(suggestTagsForTitle('Machine learning notes', popular), ['machine-learning']);
  assert.deepEqual(suggestTagsForTitle('Modern C++ in 2026', popular), ['c++']);
  assert.deepEqual(suggestTagsForTitle('A machine for coffee', popular), []);
});

test('skips tags already attached and respects the limit', () => {
  assert.deepEqual(
    suggestTagsForTitle('Debian Linux design', popular, ['Linux']),
    ['design', 'debian'],
  );
  assert.equal(suggestTagsForTitle('debian linux design machine learning', popular, [], 2).length, 2);
});

test('empty or unusable input suggests nothing', () => {
  assert.deepEqual(suggestTagsForTitle('', popular), []);
  assert.deepEqual(suggestTagsForTitle('the and of', popular), []);
  assert.deepEqual(suggestTagsForTitle('Debian', null), []);
  assert.equal(MAX_TAGS, 5);
});
