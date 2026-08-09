// lib/api-v1/auth.js
//
// Bearer-token authentication and scope resolution for the /api/v1
// surface, per #136.
//
// IMPLEMENTATION DECISION (flagging, since this wasn't specified anywhere):
// This repo already has an established pattern for validating an
// accounts.elixpo access token — app/api/auth/callback/route.js calls
// accounts.elixpo's /api/auth/me with `Authorization: Bearer <token>` and
// trusts whatever comes back, rather than verifying a JWT signature
// locally. blogs.elixpo doesn't hold accounts.elixpo's signing key, so it
// has no way to verify a JWT locally without either a shared secret or a
// JWKS endpoint — neither of which exists yet as far as I can tell from
// this repo. Reusing the same introspection-via-/me pattern here for
// consistency, rather than inventing a second, different auth mechanism.
// KNOWN COST: this means every /api/v1 request does a network round-trip
// to accounts.elixpo. That's fine for now (matches the existing pattern's
// cost) but is worth optimizing later — e.g. a dedicated introspection
// endpoint with shorter-lived cached results, or local JWKS verification
// once accounts.elixpo exposes one. Flagging as a follow-up, not fixing
// silently now, since changing the trust model is a bigger decision than
// this issue's scope.
//
// SCOPE NAMES: accounts.elixpo's current scope registry (src/lib/
// oauth-scopes.ts) only defines openid/profile/email — no LixBlogs-specific
// scopes exist yet. #79 calls for "the LixBlogs least-privilege scope
// registry" as separate, not-yet-built work. Using the same placeholder
// scope names already established in the CLI package (read, draft,
// publish, destructive) so both sides of this integration agree on names,
// pending the real registry landing.

const ACCOUNTS_USERINFO_URL =
  process.env.ELIXPO_ACCOUNTS_USERINFO_URL || 'https://accounts.elixpo.com/api/auth/me';

// Placeholder scope names — see module doc comment above.
export const KNOWN_SCOPES = ['read', 'draft', 'publish', 'destructive'];

/**
 * Verifies a bearer token by calling accounts.elixpo's userinfo endpoint.
 * Returns null if the token is missing/invalid — never throws for that
 * case, since "missing token" is an expected, common condition, not an
 * exceptional one.
 *
 * @param {Request} request
 * @returns {Promise<{ userId: string, scopes: string[] } | null>}
 */
export async function verifyBearerToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];

  let res;
  try {
    res = await fetch(ACCOUNTS_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Network failure talking to accounts.elixpo — treat as invalid token
    // rather than crashing the request; the caller gets a clean 401.
    return null;
  }

  if (!res.ok) return null;

  let userInfo;
  try {
    userInfo = await res.json();
  } catch {
    return null;
  }

  if (!userInfo?.sub && !userInfo?.id) return null;

  // accounts.elixpo's /me response shape isn't scope-aware yet (no scope
  // registry exists there — see module doc comment). Until it returns a
  // real `scope` claim, treat every valid token as holding the full
  // placeholder scope set. This is intentionally permissive as a stopgap,
  // NOT a security decision — least-privilege enforcement can't actually
  // happen until #79's scope registry exists and /me (or a token
  // introspection endpoint) returns real per-token scopes.
  const scopes = Array.isArray(userInfo.scopes) ? userInfo.scopes : KNOWN_SCOPES;

  return {
    userId: userInfo.sub || userInfo.id,
    scopes,
  };
}

/**
 * @param {{ scopes: string[] }} auth
 * @param {string} requiredScope
 */
export function hasScope(auth, requiredScope) {
  return auth.scopes.includes(requiredScope);
}
