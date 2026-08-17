---
name: lixblogs-organizations
description: >-
  Manage organization, publication, and collection-aware blog operations on
  LixBlogs with strict tenant isolation. Use this skill when inspecting organizations,
  discovering valid publishing targets, managing collections, verifying member roles,
  or drafting/publishing posts under an organization or collection boundary.
---

# LixBlogs Organizations, Publications, and Collections Skill

This skill teaches agents how to manage publications, organizations, collections,
and multi-tenant content workflows on LixBlogs using the `lixblogs-cli`.

Every operation strictly enforces tenant boundaries and role-based permissions.
No direct database, D1, or raw credential access is ever used.

---

## 1. Requirements & Scopes

- **Minimum CLI version**: `1.1.0` (check via `lixblogs --version` or `node bin/lixblogs.mjs --help`)
- **Authentication**: OAuth 2.0 device flow with scoped EdDSA access tokens.

### Operation Scope Matrix

| Operation | CLI Command | Required Scope(s) | Role Requirement |
| --- | --- | --- | --- |
| List user orgs | `lixblogs org list` | `lixblogs:org:read` | Member or Owner |
| Inspect organization | `lixblogs org get <id>` | `lixblogs:org:read` | Member / Owner (or Public) |
| List collections | `lixblogs org collections <id>` | `lixblogs:org:read` | Member / Owner (or Public) |
| List members | `lixblogs org members <id>` | `lixblogs:org:read` | Member or Owner |
| List publishing targets | `lixblogs org targets` | `lixblogs:org:read` | Caller identity |
| Create org draft | `lixblogs blog create --publication org:<id>` | `lixblogs:blog:write` | `admin`, `maintain`, or `write` |
| Edit org draft | `lixblogs blog edit <id> --publication org:<id>` | `lixblogs:blog:write` | `admin`, `maintain`, or `write` |
| Publish org post | `lixblogs blog publish <id>` | `lixblogs:blog:publish` | `admin`, `maintain`, or `write` |
| Delete/trash org post | `lixblogs blog delete <id> --yes` | `lixblogs:blog:delete` | `admin`, `maintain`, or `write` |

---

## 2. Tenant Isolation & Ownership Model

LixBlogs partitions content into three distinct ownership levels:

```
Personal (personal)
  └── Blogs authored directly by user (@username/blog-slug)

Organization (org:<orgId>)
  ├── Org Blogs (@org-slug/blog-slug)
  └── Collections (collectionId)
        └── Collection Blogs (@org-slug/collection-slug/blog-slug)
```

### Strict Tenant Boundary Rules

1. **Explicit Publication Target**:
   - `personal` — published under personal creator profile.
   - `org:<id>` — published under organization workspace. Requires active `admin`, `maintain`, or `write` membership in that specific organization.
2. **Collection Hierarchies**:
   - Collections belong to an organization (`org_id`).
   - A blog can only be assigned to a collection if the blog's publication target matches the collection's owning organization.
3. **Never Infer Tenant Access**:
   - Never assume access based on URL slugs or user-supplied names alone.
   - Always query `lixblogs org targets` or `lixblogs org get <id>` through the API to verify server-confirmed membership and write capabilities.
4. **Role Enforcement**:
   - `admin` (or `owner`): Full administration, settings, collection creation, blog authoring/publishing.
   - `maintain`: Collection management, blog authoring/publishing.
   - `write`: Blog authoring/publishing to organization and its collections.
   - `read`: Read-only access to internal drafts and org metadata. Cannot publish or mutate content.
5. **Cross-Tenant Fail-Closed Isolation**:
   - Requests targeting unauthorized organizations fail with HTTP `403` (`publication_forbidden` / `role_forbidden`) or HTTP `404` (`org_not_found`).
   - Private organizations are never disclosed to non-members.

---

## 3. Workflow Procedures

### 3.1 Discover Available Publishing Targets

Before drafting or editing content, check which personal and organization targets are writable:

```bash
lixblogs org targets --json
```

Example JSON response:
```json
{
  "ok": true,
  "personal": {
    "target": "personal",
    "name": "Personal Blog"
  },
  "organizations": [
    {
      "target": "org:f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "orgId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "slug": "engineering",
      "name": "Engineering Team",
      "role": "admin",
      "collections": [
        {
          "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "slug": "architecture",
          "name": "System Architecture"
        }
      ]
    }
  ]
}
```

### 3.2 Inspect Organization Details

Inspect members, member count, collections, and caller role:

```bash
lixblogs org get <orgId> --json
lixblogs org collections <orgId> --json
lixblogs org members <orgId> --json
```

### 3.3 Create a Blog in an Organization

Specify `--publication org:<orgId>` and optionally `--collection <collectionId>`:

```bash
# Validate first with dry-run
lixblogs blog create \
  --file post.md \
  --title "Distributed Systems Deep Dive" \
  --publication org:f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  --collection c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \
  --tag distributed-systems \
  --dry-run \
  --json

# Execute creation
lixblogs blog create \
  --file post.md \
  --title "Distributed Systems Deep Dive" \
  --publication org:f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  --collection c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \
  --tag distributed-systems \
  --json
```

### 3.4 Move or Edit Organization Content

When modifying existing content, ensure the target organization and collection belong together:

```bash
lixblogs blog edit <blogId> \
  --publication org:f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  --collection c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c \
  --json
```

### 3.5 Publish Organization Post

Publishing verifies minimum content length (>= 20 words) and author/org write authorization:

```bash
lixblogs blog publish <blogId> --dry-run --json
lixblogs blog publish <blogId> --json
```

---

## 4. Safety & Authorization Safeguards

1. **Always Use `--json` in Automation**:
   - Machine-readable output separates stdout data `{ ok: true, data: ... }` from error diagnostics.
2. **Explicit User Approval for Destructive or Membership Changes**:
   - Destructive commands (`delete`, `revoke`) require `--yes` to prevent accidental loss.
3. **Cross-Tenant Mutation Prevention**:
   - Attempting to publish with an invalid `publishedAs` (e.g. referencing an organization where caller has `read` role or no membership) will fail immediately with HTTP 403 `publication_forbidden`.
   - Attempting to attach a `collectionId` from Org A to a blog published in Org B will fail with HTTP 400 `invalid_collection`.
4. **No Direct Database Access**:
   - Never attempt to query D1 SQLite directly or bypass Bearer authentication.

---

## 5. Exit Codes & Error Reference

- **0**: Success
- **1**: General failure (invalid parameters, validation error)
- **3**: Concurrent edit conflict (`revision_conflict`, HTTP 412)
- **401**: Missing or expired session (`lixblogs auth login`)
- **403**: Forbidden / insufficient scope / role denial
- **404**: Resource not found / tenant isolation boundary
