// Helpers for the new-user onboarding flow (src/views/IntroPage.jsx).

/** A same-site path to continue to after onboarding; anything else is "/". */
export function safeNextPath(value) {
  if (typeof value !== 'string') return '/';
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/';
  if (path === '/intro' || path.startsWith('/intro?') || path.startsWith('/intro/')) return '/';
  return path;
}

/**
 * Distinct, named authors from trending posts, excluding the viewer and
 * anonymous (secret) posts, in feed order.
 */
export function uniqueAuthors(posts, viewerUsername, limit = 6) {
  const seen = new Set();
  const out = [];
  for (const post of Array.isArray(posts) ? posts : []) {
    const author = post?.author;
    const username = author?.username;
    if (!username || username === 'unknown' || username === viewerUsername || seen.has(username)) continue;
    seen.add(username);
    out.push({ username, display_name: author.display_name || '', avatar_url: author.avatar_url || '' });
    if (out.length >= limit) break;
  }
  return out;
}
