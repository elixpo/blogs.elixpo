import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canPublishModeratedContent,
  classifyModerationScore,
  extractModerationImages,
  extractModerationText,
  moderateBlogContent,
  parseModerationResponse,
} from '../lib/contentModeration.js';

test('moderation scores map to the specified threshold tiers', () => {
  assert.deepEqual(classifyModerationScore(10), { score: 10, status: 'Safe' });
  assert.deepEqual(classifyModerationScore(8), { score: 8, status: 'Safe' });
  assert.deepEqual(classifyModerationScore(7.9), { score: 7.9, status: 'Unsafe-Medium' });
  assert.deepEqual(classifyModerationScore(7.99), { score: 7.99, status: 'Unsafe-Medium' });
  assert.deepEqual(classifyModerationScore(5), { score: 5, status: 'Unsafe-Medium' });
  assert.deepEqual(classifyModerationScore(4.9), { score: 4.9, status: 'Unsafe-High' });
  assert.deepEqual(classifyModerationScore(3), { score: 3, status: 'Unsafe-High' });
  assert.deepEqual(classifyModerationScore(2.9), { score: 2.9, status: 'Unsafe-Very-High' });
  assert.deepEqual(classifyModerationScore(2.99), { score: 2.99, status: 'Unsafe-Very-High' });
  assert.deepEqual(classifyModerationScore(0), { score: 0, status: 'Unsafe-Very-High' });
  assert.equal(classifyModerationScore(-0.1), null);
  assert.equal(classifyModerationScore(10.1), null);
  assert.equal(classifyModerationScore(null), null);
  assert.equal(classifyModerationScore(' '), null);
});

test('only the very-high-risk classification blocks publication', () => {
  assert.equal(canPublishModeratedContent('Safe'), true);
  assert.equal(canPublishModeratedContent('Unsafe-Medium'), true);
  assert.equal(canPublishModeratedContent('Unsafe-High'), true);
  assert.equal(canPublishModeratedContent('Unsafe-Very-High'), false);
  assert.equal(canPublishModeratedContent('Unavailable'), true);
});

test('text and images are extracted recursively from nested blocks and tables', () => {
  const blocks = [{
    type: 'heading',
    content: [{ type: 'text', text: 'Nested headline' }],
    children: [{
      type: 'bulletListItem',
      content: [{ type: 'text', text: 'Nested list text' }],
      children: [{ type: 'image', props: { url: 'https://images.example/list.webp', caption: 'Image caption' } }],
    }],
  }, {
    type: 'paragraph',
    content: [{ type: 'text', text: 'Paragraph text' }],
  }, {
    type: 'quote',
    content: [{ type: 'text', text: 'Quoted text' }],
  }, {
    type: 'table',
    content: { rows: [{ cells: [{ content: [{ type: 'text', text: 'Table text' }] }] }] },
  }];

  const text = extractModerationText(blocks);
  assert.match(text, /Nested headline/);
  assert.match(text, /Nested list text/);
  assert.match(text, /Paragraph text/);
  assert.match(text, /Quoted text/);
  assert.match(text, /Image caption/);
  assert.match(text, /Table text/);
  assert.deepEqual(extractModerationImages(blocks, 'https://images.example/cover.webp'), [
    'https://images.example/cover.webp',
    'https://images.example/list.webp',
  ]);
});

test('image extraction skips local URLs and deduplicates attached images', () => {
  const blocks = [
    { type: 'image', props: { url: 'http://127.0.0.1/private.png' } },
    { type: 'image', props: { url: 'http://[::ffff:127.0.0.1]/private.png' } },
    { type: 'image', props: { url: 'https://images.example/a.png' } },
    { type: 'image', props: { url: 'https://images.example/a.png' } },
  ];
  assert.deepEqual(extractModerationImages(blocks), ['https://images.example/a.png']);
});

test('moderation request parses a score and sends all extracted images', async () => {
  let request;
  const result = await moderateBlogContent({
    title: 'Title',
    subtitle: 'Subtitle',
    content: [{ type: 'image', props: { url: 'https://images.example/inline.webp' } }],
    coverUrl: 'https://images.example/cover.webp',
  }, {
    apiKey: 'server-key',
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"score":4.5,"reason":"Sensitive content"}' } }],
      }), { status: 200 });
    },
  });

  assert.equal(request.body.model, 'qwen-safety');
  assert.equal(request.options.headers.Authorization, 'Bearer server-key');
  assert.deepEqual(request.body.messages[1].content.filter((part) => part.type === 'image_url').map((part) => part.image_url.url), [
    'https://images.example/cover.webp',
    'https://images.example/inline.webp',
  ]);
  assert.deepEqual(
    { score: result.score, status: result.status, reason: result.reason },
    { score: 4.5, status: 'Unsafe-High', reason: 'Sensitive content' },
  );
});

test('invalid model output and upstream failures degrade to unavailable', async () => {
  assert.equal(parseModerationResponse({ choices: [{ message: { content: 'not json' } }] }), null);

  const invalid = await moderateBlogContent({}, {
    apiKey: 'server-key',
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 }),
  });
  const failed = await moderateBlogContent({}, {
    apiKey: 'server-key',
    fetchImpl: async () => { throw new Error('network failure'); },
  });
  const unconfigured = await moderateBlogContent({});

  assert.equal(invalid.status, 'Unavailable');
  assert.equal(failed.status, 'Unavailable');
  assert.equal(unconfigured.status, 'Unavailable');
  assert.equal(invalid.score, null);
});
