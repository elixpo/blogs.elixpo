// Validation for a story's optional canonical URL (where it was first
// published). Shared by the publish API and the editor so both agree.

const SITE_HOST = 'blogs.elixpo.com';
const MAX_LENGTH = 2048;

/**
 * Returns { ok: true, value } where value is the normalised URL, or null when
 * empty or pointing back at LixBlogs (the default canonical); otherwise
 * { ok: false, error }.
 */
export function normalizeCanonicalUrl(input) {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, error: 'Canonical URL must be text.' };
  const raw = input.trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > MAX_LENGTH) return { ok: false, error: 'Canonical URL is too long.' };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Enter a full link, starting with https://' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: 'Canonical URL must start with https:// or http://' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'Canonical URL must not contain credentials.' };
  }
  if (!url.hostname.includes('.')) {
    return { ok: false, error: 'Canonical URL needs a full domain name.' };
  }
  // Pointing back at LixBlogs is the same as having no override.
  if (url.hostname.toLowerCase() === SITE_HOST) return { ok: true, value: null };
  url.hash = '';
  return { ok: true, value: url.toString() };
}
