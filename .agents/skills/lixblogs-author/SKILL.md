---
name: lixblogs-author
description: >-
  End-to-end blog authoring via the lixblogs-cli. Covers authentication,
  creating / editing / publishing / managing blog posts through the CLI,
  Markdown-to-block conversion, conflict resolution, and the LixBlogs API v1
  contract. Activate this skill when the user wants to write, edit, publish,
  or manage blog posts on LixBlogs.
---

# LixBlogs Author Skill

This skill teaches you how to author and manage blog posts on LixBlogs using
the `lixblogs-cli` package. Every command, flag, and exit code documented here
is derived from the real CLI source at `packages/lixblogs-cli/`.

> **IMPORTANT**: Never invent CLI syntax. If a command or flag is not listed in
> this document, it does not exist. Consult the CLI's `--help` output or source
> code before attempting anything unlisted.

---

## 1. Prerequisites

The CLI lives at `packages/lixblogs-cli/` in the `blogs.elixpo` monorepo.
Run it via Node directly during development:

```bash
cd packages/lixblogs-cli
npm install
node bin/lixblogs.mjs --help
```

Once published globally, the binary will be `lixblogs`.

---

## 2. Authentication

All blog operations require an authenticated session. The CLI uses OAuth 2.0
device-flow authentication against `https://accounts.elixpo.com`.

### Login

Request the scopes you need. For full blog lifecycle:

```bash
lixblogs auth login \
  --scope openid --scope profile \
  --scope lixblogs:blog:read \
  --scope lixblogs:blog:write \
  --scope lixblogs:blog:publish \
  --scope lixblogs:blog:delete
```

The `--scope` flag is **repeatable**. The CLI will print a device code and
verification URL. Use `--open` to auto-open the browser with the code
pre-filled.

### Check status

```bash
lixblogs auth status
```

Outputs per-profile login state and granted scopes. Add `--json` for
machine-readable output.

### Profiles

```bash
lixblogs auth profiles        # list all profiles
lixblogs auth use <name>      # switch active profile
```

### Logout and Revoke

```bash
lixblogs auth logout                    # clears local credentials only
lixblogs auth revoke --yes              # revokes token server-side + clears local
```

`revoke` is destructive and **requires `--yes`**. Without it, the command
exits with an error (fail-closed design).

---

## 3. Blog Lifecycle

### 3.1 List blogs

```bash
lixblogs blog list
lixblogs blog list --status draft
lixblogs blog list --status published
lixblogs blog list --status all
lixblogs blog list --limit 50 --json
```

`--status` accepts: `draft`, `published`, `all`. `--limit` accepts
1-100. Pagination uses an opaque `--cursor` value from the previous
response's `meta.nextCursor`.

### 3.2 Get a single blog

```bash
lixblogs blog get <id>
lixblogs blog get <id> --json
```

Returns the blog metadata and content. The `--json` output includes a
`markdown` field with the server content converted back to Markdown.

### 3.3 Create a blog

Content input is **mutually exclusive** - use exactly one of:

- `--file` - Path to a local `.md` file
- `--stdin` - Read Markdown from standard input
- `--content` - Inline Markdown string
- `--editor` - Opens EDITOR/VISUAL for interactive editing

```bash
lixblogs blog create --file post.md --title "My Post" --tag engineering
lixblogs blog create --content "# Hello" --title "Quick Post"
cat draft.md | lixblogs blog create --stdin --title "Piped Post"
lixblogs blog create --editor --title "Interactive Post"
```

**Metadata flags** (all optional on create):

- `--title` - Title (max 300 chars)
- `--subtitle` - Subtitle (max 500 chars)
- `--slug` - URL slug
- `--emoji` - Emoji for the post
- `--tag` - Repeatable, max 5 tags
- `--cover` - Cover image URL (must be HTTPS)
- `--publication` - `personal` or `org:<id>`
- `--collection` - Collection ID
- `--member-only` / `--no-member-only` - Member-only toggle
- `--secret` / `--not-secret` - Secret toggle

All mutation commands accept `--dry-run` to validate without sending changes.

### 3.4 Edit a blog

```bash
lixblogs blog edit <id> --file updated.md
lixblogs blog edit <id> --editor
lixblogs blog edit <id> --title "New Title" --tag updated-tag
```

The CLI automatically fetches the current server version and its ETag.
You can also pass `--etag` explicitly if you have it.

#### Conflict Resolution (Exit Code 3)

If another editor modified the blog between your fetch and your write, the
server returns HTTP 412. The CLI:

1. Exits with **code 3**
2. Saves your local changes to `.lixblogs-conflicts/<id>-local.json`
3. Saves the server's current content to `.lixblogs-conflicts/<id>-server.md`
4. In `--json` mode, includes `details.localPath`, `details.serverPath`,
   and `details.serverEtag` in the error output

**As an agent, when you see exit code 3:**
- Read both conflict files
- Merge the changes (prefer the user's intent when possible)
- Re-submit with the new `--etag` from `details.serverEtag`

### 3.5 Publish / Unpublish

```bash
lixblogs blog publish <id>
lixblogs blog unpublish <id>
```

Publishing validates that the post has a title and at least 20 words of content.
Both accept `--dry-run`.

### 3.6 Delete / Restore

```bash
lixblogs blog delete <id> --yes              # moves to trash
lixblogs blog delete <id> --permanent --yes  # permanent deletion
lixblogs blog restore <id>                   # restores from trash
```

- `--yes` is **required** for deletion (fail-closed)
- `--permanent` requires the `lixblogs:blog:delete:permanent` scope
- Both accept `--dry-run`

---

## 4. Content Format

The CLI converts Markdown to a block array for the API. Supported block types:

- `# Heading` -> `heading` (levels 1-3 via # to ###)
- Plain text -> `paragraph` (consecutive lines merged)
- `- item` -> `bulletListItem`
- `1. item` -> `numberedListItem`
- `> quote` -> `quote`
- Fenced code blocks -> `codeBlock` (with `props.language`)
- Fenced mermaid blocks -> `mermaidBlock` (with `props.diagram`)
- `![alt](https://...)` -> `image` (HTTPS URLs only)
- `---` -> `divider`

**Validation rules:**
- Title: max 300 characters
- Subtitle: max 500 characters
- Tags: at most 5
- Cover URL: must be HTTPS
- Content: max 1.5 MB serialized
- Publishing requires a title and at least 20 words

---

## 5. Global Flags

- `--profile <name>` - Named profile (default: "default")
- `--env <environment>` - development | staging | production
- `--scope <scope>` - Additional OAuth scope (repeatable)
- `--open` - Auto-open verification URL in browser
- `--accounts-url <url>` - Override Accounts issuer
- `--api-url <url>` - Override API origin (default: blogs.elixpo.com)
- `--json` - Machine-readable JSON output
- `--quiet` - Suppress non-essential output
- `--yes` / `-y` - Auto-confirm destructive actions
- `--allow-insecure-fallback` - Use in-memory store if keychain unavailable
- `--dry-run` - Validate without sending (mutations only)

---

## 6. Exit Codes

- **0** - Success
- **1** - General error (invalid input, API error, auth failure)
- **3** - Edit conflict: server has a newer revision (HTTP 412)

---

## 7. API Contract Summary

- **Issuer**: `https://accounts.elixpo.com`
- **Resource API**: `https://blogs.elixpo.com/api/v1`
- **Token type**: EdDSA access tokens (audience: `blogs.elixpo.com`)
- **Response envelope**: `{ "data": {}, "meta": {} }` on success
- **Error envelope**: `{ "error": { "code", "message", "requestId" } }`
- **Concurrency**: ETag-based optimistic locking; `If-Match` required for writes
- **Idempotency**: Mutations use `Idempotency-Key` (8-128 URL-safe chars, 24h TTL)
- **Rate limiting**: Bounded per-minute limits via `X-RateLimit-*` headers

---

## 8. Agent Best Practices

1. **Always use `--json`** when parsing CLI output programmatically.
2. **Always use `--dry-run`** before destructive or irreversible operations.
3. **Handle exit code 3** explicitly for edit conflicts - never retry blindly.
4. **Request only the scopes you need** during login.
5. **Never log or store tokens** - the CLI handles credential storage via the
   OS keychain.
6. **Pipe content via `--file` or `--stdin`** for large posts; avoid
   `--content` for anything longer than a paragraph.
7. **Check `auth status`** before starting a workflow to verify the session
   is still valid and has the required scopes.
