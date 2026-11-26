import test from 'node:test';
import assert from 'node:assert/strict';
import { readPublishedFlag, shareTargets } from '../src/utils/publishedShare.js';

function fakeWindow(href) {
  const url = new URL(href);
  const calls = [];
  globalThis.window = {
    location: { pathname: url.pathname, search: url.search, hash: url.hash },
    history: { state: null, replaceState: (_s, _t, next) => calls.push(next) },
  };
  return calls;
}

test('reads ?published=new|updated once and strips only that param', () => {
  let calls = fakeWindow('https://blogs.elixpo.com/ana/post?published=new&ref=x#intro');
  assert.equal(readPublishedFlag(), 'new');
  assert.deepEqual(calls, ['/ana/post?ref=x#intro']);

  calls = fakeWindow('https://blogs.elixpo.com/ana/post?published=updated');
  assert.equal(readPublishedFlag(), 'updated');
  assert.deepEqual(calls, ['/ana/post']);
});

test('ignores missing or unknown flags without touching history', () => {
  for (const href of ['https://blogs.elixpo.com/ana/post', 'https://blogs.elixpo.com/ana/post?published=1']) {
    const calls = fakeWindow(href);
    assert.equal(readPublishedFlag(), null);
    assert.deepEqual(calls, []);
  }
  delete globalThis.window;
  assert.equal(readPublishedFlag(), null);
});

test('share links encode the URL and title and carry no tracking params', () => {
  const url = 'https://blogs.elixpo.com/ana/a&b?x=1';
  const targets = shareTargets(url, 'Tips & "tricks"');
  assert.deepEqual(targets.map((t) => t.name), ['X', 'LinkedIn', 'Reddit', 'Hacker News', 'Facebook', 'WhatsApp', 'Email']);
  for (const target of targets) {
    assert.ok(target.href.includes(encodeURIComponent(url)), target.name);
    assert.doesNotMatch(target.href, /utm_|fbclid|gclid|ref=/, target.name);
  }
  assert.match(targets[0].href, /text=Tips%20%26%20%22tricks%22/);
  assert.match(shareTargets(url, '')[0].href, /A%20story%20on%20LixBlogs/);
});
