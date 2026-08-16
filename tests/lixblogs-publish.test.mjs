import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);

// Helper to run the CLI as a subprocess asynchronously
async function runCLI(args, env = {}) {
  try {
    const { stdout, stderr } = await execFileAsync('node', ['scripts/lixblogs-cli.js', ...args], {
      env: {
        ...process.env,
        ...env,
      },
    });
    return { stdout, stderr, status: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      status: error.code || error.status || 1,
    };
  }
}

// Helper to cleanup recovery dir
function cleanupRecoveryDir() {
  const dir = path.resolve('.lixblogs-recovery');
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('lixblogs-publish CLI suite', async (t) => {
  let mockPort;
  let mockServer;
  let lastRequest = null;
  let getResponseStatus = 200;
  let getResponseBody = {};
  let mutationResponseStatus = 200;
  let mutationResponseBody = {};

  // Setup local mock HTTP server
  await new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        lastRequest = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body ? JSON.parse(body) : null,
        };

        if (req.method === 'GET') {
          res.writeHead(getResponseStatus, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(getResponseBody));
        } else {
          res.writeHead(mutationResponseStatus, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mutationResponseBody));
        }
      });
    });

    mockServer.listen(0, '127.0.0.1', () => {
      mockPort = mockServer.address().port;
      resolve();
    });
  });

  // Common environmental setup
  const envOpts = {
    LIXBLOGS_URL: `http://127.0.0.1:${mockPort}`,
    LIXBLOGS_TOKEN: 'valid_session_token',
  };

  const sampleBlocks = [
    { id: 'b1', type: 'paragraph', content: [{ type: 'text', text: 'This is a long blog post with enough content. One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty.' }] }
  ];

  const mockBlog = {
    id: 'test-slugid',
    slug: 'test-slug',
    title: 'A Valid Blog Title',
    subtitle: 'A nice subtitle',
    content: JSON.stringify(sampleBlocks),
    author_id: 'user-123',
    published_as: 'personal',
    status: 'draft',
    updated_at: 10002000,
    owner_username: 'testuser',
  };

  t.after(() => {
    mockServer.close();
    cleanupRecoveryDir();
  });

  await t.test('declares CLI version', async () => {
    const { stdout, status } = await runCLI(['--version']);
    assert.equal(status, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  await t.test('fails when credentials (token) are missing', async () => {
    const { stderr, status } = await runCLI(['blog', 'show', 'test-slugid'], { LIXBLOGS_TOKEN: '' });
    assert.equal(status, 401);
    assert.match(stderr, /Credentials missing/);
  });

  await t.test('blog show returns details correctly', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: mockBlog };

    const { stdout, status } = await runCLI(['blog', 'show', 'test-slugid'], envOpts);
    assert.equal(status, 0);
    assert.match(stdout, /Title\s+:\s+A Valid Blog Title/);
    assert.match(stdout, /Status\s+:\s+DRAFT/);
    assert.match(stdout, /Word Count\s+:\s+29 words/);
  });

  await t.test('blog show returns JSON correctly', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: mockBlog };

    const { stdout, status } = await runCLI(['blog', 'show', 'test-slugid', '--json'], envOpts);
    assert.equal(status, 0);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.id, 'test-slugid');
    assert.equal(parsed.word_count, 29);
  });

  await t.test('fails closed on interactive prompt without --yes', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: mockBlog };

    const { status, stderr } = await runCLI(['blog', 'publish', 'test-slugid'], envOpts);
    assert.equal(status, 403);
    assert.match(stderr, /Action cancelled by user/);
  });

  await t.test('publishing with short word count fails locally', async () => {
    const shortBlog = {
      ...mockBlog,
      content: JSON.stringify([{ type: 'paragraph', content: [{ type: 'text', text: 'Short' }] }]),
    };
    getResponseStatus = 200;
    getResponseBody = { blog: shortBlog };

    const { stderr, status } = await runCLI(['blog', 'publish', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 400);
    assert.match(stderr, /Need at least 20 words to publish/);
  });

  await t.test('publishing successful and creates recovery backup', async () => {
    cleanupRecoveryDir();
    getResponseStatus = 200;
    getResponseBody = { blog: mockBlog };
    mutationResponseStatus = 200;
    mutationResponseBody = { ok: true, url: '/@testuser/test-slug', updatedAt: 10002050 };

    const { stdout, status } = await runCLI(['blog', 'publish', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 0);
    assert.match(stdout, /Operation \[publish\] completed/);
    assert.match(stdout, /Canonical URL: http:\/\/127.0.0.1:.*\/@testuser\/test-slug/);

    // Verify request payload sent to API
    assert.equal(lastRequest.method, 'POST');
    assert.equal(lastRequest.url, '/api/blogs/publish');
    assert.equal(lastRequest.body.status, 'published');
    assert.equal(lastRequest.body.lastKnownUpdatedAt, 10002000);

    // Verify recovery artifact exists
    const recoveryFiles = fs.readdirSync(path.resolve('.lixblogs-recovery'));
    assert.equal(recoveryFiles.length, 1);
    assert.match(recoveryFiles[0], /^test-slugid-\d+\.json$/);
    const backupContent = JSON.parse(fs.readFileSync(path.join('.lixblogs-recovery', recoveryFiles[0]), 'utf8'));
    assert.equal(backupContent.title, 'A Valid Blog Title');
  });

  await t.test('unpublishing draft successful', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: { ...mockBlog, status: 'published' } };
    mutationResponseStatus = 200;
    mutationResponseBody = { ok: true, updatedAt: 10003000 };

    const { status } = await runCLI(['blog', 'unpublish', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 0);
    assert.equal(lastRequest.body.status, 'draft');
  });

  await t.test('trash (archive) blog successful', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: mockBlog };
    mutationResponseStatus = 200;
    mutationResponseBody = { ok: true, updatedAt: 10004000 };

    const { status } = await runCLI(['blog', 'trash', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 0);
    assert.equal(lastRequest.body.status, 'archived');
  });

  await t.test('restore blog successful', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: { ...mockBlog, status: 'archived' } };
    mutationResponseStatus = 200;
    mutationResponseBody = { ok: true, updatedAt: 10005000 };

    const { status } = await runCLI(['blog', 'restore', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 0);
    assert.equal(lastRequest.body.status, 'draft'); // Default status on restore
  });

  await t.test('permanently delete blog successful', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: mockBlog };
    mutationResponseStatus = 200;
    mutationResponseBody = { ok: true, deleted: true };

    const { status } = await runCLI(['blog', 'delete', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 0);
    assert.equal(lastRequest.method, 'DELETE');
    assert.equal(lastRequest.url, '/api/blogs/test-slugid');
  });

  await t.test('handles concurrent edit conflicts (409)', async () => {
    getResponseStatus = 200;
    getResponseBody = { blog: mockBlog };
    mutationResponseStatus = 409;
    mutationResponseBody = { error: 'conflict', message: 'This blog was updated by someone else.' };

    const { status, stderr } = await runCLI(['blog', 'publish', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 409);
    assert.match(stderr, /Conflict: This blog was updated by someone else/);
  });

  await t.test('handles revoked/invalid credentials (401)', async () => {
    getResponseStatus = 401;

    const { status, stderr } = await runCLI(['blog', 'publish', 'test-slugid', '--yes'], envOpts);
    assert.equal(status, 401);
    assert.match(stderr, /Unauthorized. Session token is invalid or expired/);
  });
});
