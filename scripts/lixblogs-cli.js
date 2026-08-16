#!/usr/bin/env node
/**
 * LixBlogs CLI — Publish, unpublish, trash, restore, and delete content safely.
 *
 * Scopes:
 *   - blog:read      Preview/Show current blog metadata and state
 *   - blog:write     Draft/Save changes and restore archived blogs
 *   - blog:publish   Publish and unpublish blogs
 *   - blog:delete    Trash (archive) and permanently delete blogs
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { env, argv } from 'node:process';

const CLI_VERSION = '1.4.0';

// Word count check
function countWords(blocks) {
  if (!blocks) return 0;
  let parsed = blocks;
  if (typeof blocks === 'string') {
    try {
      parsed = JSON.parse(blocks);
    } catch {
      return 0;
    }
  }
  if (!Array.isArray(parsed)) return 0;
  return parsed
    .map(b => (b.content && Array.isArray(b.content)) ? b.content.map(c => c.text || '').join('') : '')
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

// Ask user confirmation via stdin
function askConfirmation(questionText) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(false);
      return;
    }
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${questionText} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// Save backup file locally
function saveRecoveryArtifact(slugid, blogData) {
  try {
    const recoveryDir = path.resolve('.lixblogs-recovery');
    if (!fs.existsSync(recoveryDir)) {
      fs.mkdirSync(recoveryDir, { recursive: true });
    }
    const timestamp = Date.now();
    const filePath = path.join(recoveryDir, `${slugid}-${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(blogData, null, 2), 'utf8');
    return filePath;
  } catch (err) {
    console.error(`Warning: Failed to save recovery artifact: ${err.message}`);
    return null;
  }
}

// Fetch helper with retry and exponential backoff
async function fetchWithRetry(url, options, retries = 3, delay = 100) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 502 && response.status <= 504 && attempt < retries) {
        throw new Error(`Transient server error: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, backoffDelay));
    }
  }
}

// Main execution
async function main() {
  const args = argv.slice(2);

  // Version flag
  if (args.includes('--version') || args.includes('-v')) {
    console.log(CLI_VERSION);
    process.exitCode = 0;
    return;
  }

  // Parse arguments and flags
  const flags = {
    revision: null,
    yes: false,
    json: false,
    status: null,
    url: env.LIXBLOGS_URL || 'http://localhost:3000',
    token: env.LIXBLOGS_TOKEN || null,
  };

  const cleanArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--revision') {
      flags.revision = args[++i];
    } else if (args[i] === '--yes' || args[i] === '-y') {
      flags.yes = true;
    } else if (args[i] === '--json') {
      flags.json = true;
    } else if (args[i] === '--status') {
      flags.status = args[++i];
    } else if (!args[i].startsWith('--')) {
      cleanArgs.push(args[i]);
    }
  }

  const [command, subcommand, targetId] = cleanArgs;

  const logError = (msg) => {
    if (flags.json) {
      console.log(JSON.stringify({ error: msg }));
    } else {
      console.error(`✗ Error: ${msg}`);
    }
  };

  if (!flags.token) {
    logError('Credentials missing. Please set LIXBLOGS_TOKEN environment variable.');
    process.exitCode = 401;
    return;
  }

  if (command !== 'blog') {
    logError('Invalid command. Supported: blog show, blog publish, blog unpublish, blog trash, blog restore, blog delete');
    process.exitCode = 1;
    return;
  }

  if (!['show', 'publish', 'unpublish', 'trash', 'restore', 'delete'].includes(subcommand)) {
    logError(`Invalid subcommand: "${subcommand}". Supported: show, publish, unpublish, trash, restore, delete`);
    process.exitCode = 1;
    return;
  }

  if (!targetId) {
    logError('Missing target blog slugid.');
    process.exitCode = 1;
    return;
  }

  const cookieHeader = `lixblogs_session=${flags.token}`;

  // 1. Pre-flight inspection: fetch current blog state
  let blogState;
  try {
    const response = await fetchWithRetry(`${flags.url}/api/blogs/draft?slugid=${targetId}`, {
      headers: {
        'Cookie': cookieHeader,
      },
    });

    if (response.status === 401) {
      logError('Unauthorized. Session token is invalid or expired.');
      process.exitCode = 401;
      return;
    }

    if (response.status === 404) {
      logError('Blog post not found.');
      process.exitCode = 404;
      return;
    }

    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.blog) {
      throw new Error('Invalid API response structure');
    }
    blogState = data.blog;
  } catch (err) {
    logError(`Failed to connect to LixBlogs API: ${err.message}`);
    process.exitCode = 500;
    return;
  }

  const wordCount = countWords(blogState.content);

  // Subcommand: SHOW
  if (subcommand === 'show') {
    if (flags.json) {
      console.log(JSON.stringify({
        id: blogState.id,
        title: blogState.title,
        subtitle: blogState.subtitle,
        status: blogState.status,
        author_id: blogState.author_id,
        published_as: blogState.published_as,
        updated_at: blogState.updated_at,
        word_count: wordCount,
        required_scope: 'blog:read',
      }, null, 2));
    } else {
      console.log('=== LixBlogs Post Preview ===');
      console.log(`Title        : ${blogState.title || '(Untitled)'}`);
      console.log(`Subtitle     : ${blogState.subtitle || '(No subtitle)'}`);
      console.log(`Status       : ${blogState.status.toUpperCase()}`);
      console.log(`Word Count   : ${wordCount} words`);
      console.log(`Revision     : ${blogState.updated_at}`);
      console.log(`Owner/Author : ${blogState.owner_username || blogState.author_id}`);
      console.log(`Scope Req    : blog:read`);
      console.log('=============================');
    }
    process.exitCode = 0;
    return;
  }

  // Save local recovery artifact before mutation
  const backupPath = saveRecoveryArtifact(blogState.id, blogState);

  // Define consequences, warning, and scopes
  let warningMessage = '';
  let requiredScope = '';
  let targetStatus = '';
  let isDestructive = false;

  if (subcommand === 'publish') {
    requiredScope = 'blog:publish';
    targetStatus = 'published';
    warningMessage = `This action will make the story public and discoverable at blogs.elixpo.com under account "${blogState.owner_username}".`;
    isDestructive = true; // Public action requires confirmation

    // Local content validation
    if (!blogState.title?.trim()) {
      logError('Validation failed: Blog title cannot be empty.');
      process.exitCode = 400;
      return;
    }
    if (wordCount < 20) {
      logError(`Validation failed: Post content has only ${wordCount} words. Need at least 20 words to publish.`);
      process.exitCode = 400;
      return;
    }
    if ((blogState.title?.length || 0) > 300) {
      logError('Validation failed: Title exceeds 300 characters.');
      process.exitCode = 400;
      return;
    }
    if ((blogState.subtitle?.length || 0) > 500) {
      logError('Validation failed: Subtitle exceeds 500 characters.');
      process.exitCode = 400;
      return;
    }
  } else if (subcommand === 'unpublish') {
    requiredScope = 'blog:publish';
    targetStatus = 'draft';
    warningMessage = 'This action will unpublish the story, moving it back to a private draft state.';
  } else if (subcommand === 'trash') {
    requiredScope = 'blog:delete';
    targetStatus = 'archived';
    warningMessage = 'This action will move the story to the trash (archive). It will not be visible to readers, but it can be restored later.';
    isDestructive = true;
  } else if (subcommand === 'restore') {
    requiredScope = 'blog:delete';
    targetStatus = flags.status || 'draft';
    warningMessage = `This action will restore the archived story back to status "${targetStatus}".`;
  } else if (subcommand === 'delete') {
    requiredScope = 'blog:delete';
    warningMessage = 'CRITICAL WARNING: This action will PERMANENTLY delete the story and all comments/likes. This action CANNOT BE UNDONE!';
    isDestructive = true;
  }

  // Display warnings and verify confirmation
  if (!flags.json) {
    console.warn(`\n⚠️  Scope Required: ${requiredScope}`);
    console.warn(`⚠️  Consequence: ${warningMessage}`);
    if (backupPath) {
      console.warn(`💾 Local recovery backup saved to: ${backupPath}`);
    }
  }

  // Confirmation gate
  if (!flags.yes) {
    const confirmed = await askConfirmation('Do you want to proceed?');
    if (!confirmed) {
      logError('Action cancelled by user.');
      process.exitCode = 403;
      return;
    }
  }

  // 2. Perform API Mutation
  try {
    let response;
    if (subcommand === 'delete') {
      response = await fetchWithRetry(`${flags.url}/api/blogs/${blogState.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': cookieHeader,
        },
      });
    } else {
      // Package the original state with the targetStatus mutation
      const body = {
        slugid: blogState.id,
        title: blogState.title,
        subtitle: blogState.subtitle,
        tags: blogState.tags,
        publishAs: blogState.published_as,
        editorContent: blogState.content,
        pageEmoji: blogState.page_emoji,
        coverUrl: blogState.cover_image_r2_key,
        coverPos: { x: blogState.cover_pos_x, y: blogState.cover_pos_y },
        coverZoom: blogState.cover_zoom,
        status: targetStatus,
        lastKnownUpdatedAt: flags.revision ? Number(flags.revision) : blogState.updated_at,
        slug: blogState.slug,
        collectionId: blogState.collection_id,
        secret: blogState.secret,
        member_only: blogState.member_only,
      };

      response = await fetchWithRetry(`${flags.url}/api/blogs/publish`, {
        method: 'POST',
        headers: {
          'Cookie': cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }

    // Handle conflict (409)
    if (response.status === 409) {
      logError('Conflict: This blog was updated by someone else. Please sync before modifying.');
      process.exitCode = 409;
      return;
    }

    if (response.status === 401) {
      logError('Unauthorized. Session token is invalid or expired.');
      process.exitCode = 401;
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (flags.json) {
      console.log(JSON.stringify({
        ok: true,
        command: subcommand,
        slugid: blogState.id,
        result: result,
      }, null, 2));
    } else {
      console.log(`\n✓ Success! Operation [${subcommand}] completed.`);
      if (result.url) {
        console.log(`🔗 Canonical URL: ${flags.url}${result.url}`);
      }
      if (result.updatedAt) {
        console.log(`🔑 New Revision  : ${result.updatedAt}`);
      }
    }
    process.exitCode = 0;
    return;
  } catch (err) {
    logError(`API Mutation failed: ${err.message}`);
    process.exitCode = 500;
    return;
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exitCode = 1;
});
