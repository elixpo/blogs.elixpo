-- 0043_api_v1_idempotency_audit.sql
--
-- Two tables backing the /api/v1 bearer-token API's requirements (#136):
--
-- api_idempotency_keys: caches the response for a given (client, key)
-- pair so a retried create/publish/upload request returns the original
-- result instead of creating a duplicate. Keys expire after
-- IDEMPOTENCY_KEY_TTL_SECONDS (see lib/api-v1/idempotency.js) — this
-- table is NOT meant to grow forever; cleanup of expired rows is the
-- caller's job (see the cleanup query in idempotency.js), same bounded-
-- expiry pattern as the accounts.elixpo device-authorization design.
--
-- api_audit_events: one row per mutating /api/v1 request. Per the
-- resolved design decision, writes here must never sit on the
-- client-facing request path — see lib/api-v1/audit.js, which fires
-- this asynchronously (via ctx.waitUntil in the edge runtime) after the
-- primary transaction already committed and the response is already
-- being returned to the client.

CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  request_body_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);

-- One physical key can only ever mean one thing per user+endpoint — this
-- is what lets us detect "same key, different body" (a client bug or a
-- key collision) as distinct from a legitimate retry.
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_idempotency_lookup
  ON api_idempotency_keys(user_id, endpoint, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_expiry
  ON api_idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS api_audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  scope_used TEXT,
  outcome TEXT NOT NULL, -- 'success' | 'error'
  status_code INTEGER NOT NULL,
  resource_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_api_audit_user_time
  ON api_audit_events(user_id, created_at);
