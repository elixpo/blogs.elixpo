import { NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/settings', '/new-blog'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Auth protection
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const session = request.cookies.get('lixblogs_session')?.value;
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api|favicon.ico|logo.png|base-logo.png).*)'],
};
