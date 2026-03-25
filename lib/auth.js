import { cookies } from 'next/headers';

const SESSION_COOKIE = 'lixblogs_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 15; // 15 days in seconds

export function getOAuthConfig() {
  return {
    clientId: process.env.ELIXPO_CLIENT_ID,
    clientSecret: process.env.ELIXPO_CLIENT_SECRET,
    authorizeUrl: 'https://accounts.elixpo.com/oauth/authorize',
    tokenUrl: 'https://accounts.elixpo.com/api/auth/token',
    userInfoUrl: 'https://accounts.elixpo.com/api/auth/me',
    redirectUri: process.env.NEXT_PUBLIC_URL + '/auth/callback',
    scope: 'openid profile email',
  };
}

export async function setSessionCookie(tokenData) {
  const cookieStore = await cookies();
  const session = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  });

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getUser() {
  const session = await getSession();
  if (!session) return null;

  const config = getOAuthConfig();

  // If access token expired, try refresh
  if (Date.now() >= session.expiresAt) {
    const refreshed = await refreshAccessToken(session.refreshToken);
    if (!refreshed) {
      await clearSession();
      return null;
    }
    session.accessToken = refreshed.access_token;
    session.expiresAt = Date.now() + refreshed.expires_in * 1000;
    session.refreshToken = refreshed.refresh_token;
    await setSessionCookie(refreshed);
  }

  const res = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!res.ok) {
    await clearSession();
    return null;
  }

  return res.json();
}

async function refreshAccessToken(refreshToken) {
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    }),
  });

  if (!res.ok) return null;
  return res.json();
}
