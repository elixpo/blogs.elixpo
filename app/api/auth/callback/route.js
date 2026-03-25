import { NextResponse } from 'next/server';
import { getOAuthConfig, setSessionCookie } from '../../../../lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/auth/login?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=missing_code', request.url));
  }

  // Validate CSRF state
  const cookieStore = request.cookies;
  const savedState = cookieStore.get('oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_state', request.url));
  }

  const config = getOAuthConfig();

  // Exchange code for tokens
  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/auth/login?error=token_exchange_failed', request.url));
  }

  const tokenData = await tokenRes.json();

  // Set 15-day session cookie
  await setSessionCookie(tokenData);

  // Clear the oauth_state cookie
  const response = NextResponse.redirect(new URL('/feed', request.url));
  response.cookies.delete('oauth_state');
  return response;
}
