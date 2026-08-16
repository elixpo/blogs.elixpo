---
name: lixblogs-publish
description: >-
  Use this skill to safely publish, unpublish, trash (archive), restore, or permanently delete LixBlogs blog posts.
  Ensures pre-flight metadata checks, user warnings, conflict resolution, local backup creation, and deterministic execution.
---

# LixBlogs Publish & Deletion Skill

This skill teaches you how to safely manage LixBlogs stories using the LixBlogs CLI wrapper (`node scripts/lixblogs-cli.js`). All interactions with the API must go through the CLI to enforce safety, warnings, and local backups.

## Requirements & Scope Mapping

- **Minimum CLI version**: `1.4.0` (check with `node scripts/lixblogs-cli.js --version`)
- **Required Environment Variables**:
  - `LIXBLOGS_TOKEN`: OAuth/Session token (authenticates as the user)
  - `LIXBLOGS_URL`: Target instance URL (defaults to `http://localhost:3000`)

### Operation Scopes

Operation | Subcommand | Required API Scope | Destructive/Public?
--- | --- | --- | ---
Preview & Verify | `show` | `blog:read` | No
Publish / Update | `publish` | `blog:publish` | Yes (Publicly viewable)
Unpublish (to draft) | `unpublish` | `blog:publish` | No (Removes public access)
Trash (to archive) | `trash` | `blog:delete` | Yes (Removes from feed/profile)
Restore (to draft) | `restore` | `blog:delete` | No
Permanent Delete | `delete` | `blog:delete` | Yes (Irreversible)

---

## Safety & Validation Rules

1. **Pre-flight Inspection**: Always check the blog's current status and metadata using `blog show` before attempting mutations.
2. **Consequences & Scopes Warning**: Before executing public (`publish`) or destructive (`trash`, `delete`) actions, display the consequence warning and required scope to the creator.
3. **Fail-Closed Confirmation**:
   - In **interactive creator** mode, the CLI will prompt for confirmation.
   - In **agent / non-interactive** mode (e.g. CI, scripts), you must pass the `--yes` flag to bypass the prompt. Without `--yes`, the CLI will fail closed and exit with code `403`.
4. **ETags & Conflict Resolution**:
   - The CLI uses `updated_at` timestamps as revision ETags.
   - To prevent concurrent-edit conflicts, fetch the current state, note the `Revision` timestamp, and supply it via `--revision <etag>` on mutation.
   - If the server has a newer update, the CLI exits with code `409`. In this case, you must re-fetch and merge changes before attempting to publish again.
5. **Local Backups (Recovery Artifacts)**:
   - Any mutating operation (`publish`, `unpublish`, `trash`, `restore`, `delete`) automatically dumps a backup of the blog's draft payload to `.lixblogs-recovery/<slugid>-<timestamp>.json`.
   - Inform the user of the path to this recovery artifact on failure or completion.

---

## Action Procedures

### 1. Preview Draft Details
Check the word count and title validity before publishing:
```bash
node scripts/lixblogs-cli.js blog show <slugid>
```

For JSON format output:
```bash
node scripts/lixblogs-cli.js blog show <slugid> --json
```

### 2. Publish a Blog Draft
Publishes a draft or updates an existing published post. Requires `blogState.title` to be set and word count >= 20.
```bash
# Agent Mode: deterministic JSON & auto-confirm
node scripts/lixblogs-cli.js blog publish <slugid> --revision <etag> --yes --json
```

### 3. Unpublish to Draft
Reverts a published blog back to a private draft.
```bash
node scripts/lixblogs-cli.js blog unpublish <slugid> --yes --json
```

### 4. Trash (Archive) Blog
Moves a blog to the trash/archive (hidden from feed and profile, but not hard deleted).
```bash
node scripts/lixblogs-cli.js blog trash <slugid> --yes --json
```

### 5. Restore an Archived Blog
Restores a trashed blog back to a draft (or a custom status using `--status`).
```bash
node scripts/lixblogs-cli.js blog restore <slugid> --status draft --yes --json
```

### 6. Permanently Delete Blog
Permanently wipes a blog post from the system. **Irreversible**. A backup artifact is created inside `.lixblogs-recovery/` first.
```bash
node scripts/lixblogs-cli.js blog delete <slugid> --yes --json
```
