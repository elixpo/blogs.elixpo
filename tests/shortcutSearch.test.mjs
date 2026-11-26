import test from 'node:test';
import assert from 'node:assert/strict';
import { filterShortcutGroups } from '../src/utils/shortcutSearch.js';

const groups = [
  { title: 'Formatting', shortcuts: [{ keys: ['Ctrl', 'B'], desc: 'Bold' }, { keys: ['Ctrl', 'I'], desc: 'Italic' }] },
  { title: 'Blocks', shortcuts: [{ keys: ['Tab'], desc: 'Indent block' }, { keys: ['Alt', '↑ / ↓'], desc: 'Move block up / down' }] },
];

test('an empty query returns every group unchanged', () => {
  assert.equal(filterShortcutGroups(groups, ''), groups);
  assert.equal(filterShortcutGroups(groups, '   '), groups);
});

test('matches descriptions case-insensitively and drops empty groups', () => {
  assert.deepEqual(filterShortcutGroups(groups, 'BLOCK').map((g) => g.title), ['Blocks']);
  assert.deepEqual(filterShortcutGroups(groups, 'bold')[0].shortcuts.map((s) => s.desc), ['Bold']);
});

test('matches an exact key name, and nothing for unknown text', () => {
  assert.deepEqual(filterShortcutGroups(groups, 'tab')[0].shortcuts.map((s) => s.desc), ['Indent block']);
  assert.deepEqual(filterShortcutGroups(groups, 'zzz'), []);
});
