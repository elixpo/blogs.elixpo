import test from 'node:test';
import assert from 'node:assert/strict';

// Run the real SQL against SQLite (the engine behind D1). node:sqlite ships
// with Node 22+; skip rather than fail on runtimes that do not have it.
let DatabaseSync;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  // handled by the skip flag below
}
const skip = !DatabaseSync && 'node:sqlite is not available on this runtime';
const { reserveName, tryReserveName } = await import('../lib/namespace.js');

function d1(sqlite) {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async run() {
              const info = sqlite.prepare(sql).run(...params);
              return { meta: { changes: Number(info.changes) } };
            },
            async first() {
              return sqlite.prepare(sql).get(...params) ?? null;
            },
          };
        },
      };
    },
  };
}

// A user whose namespace row was never seeded: sign-up reserves it best-effort.
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT);
    CREATE TABLE namespaces (name TEXT PRIMARY KEY, owner_type TEXT, owner_id TEXT, created_at INTEGER);
    INSERT INTO users (id, username) VALUES ('u1', 'salonist');
  `);
  return { sqlite, db: d1(sqlite) };
}

test('an org cannot claim a username whose namespace row is missing', { skip }, async () => {
  const { sqlite, db } = setup();
  const res = await tryReserveName(db, 'salonist', 'org', 'o1');
  assert.equal(res.success, false);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM namespaces').get().n, 0);
});

test('an org rename cannot claim an existing username either', { skip }, async () => {
  const { db } = setup();
  assert.equal((await reserveName(db, 'Salonist', 'org', 'o1')).success, false);
});

test('free names and user self-reservations still succeed', { skip }, async () => {
  const { db } = setup();
  assert.equal((await tryReserveName(db, 'salonist-hq', 'org', 'o1')).success, true);
  assert.equal((await tryReserveName(db, 'salonist', 'user', 'u1')).success, true);
});
