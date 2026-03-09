import { NextResponse, type NextRequest } from 'next/server';
import { verifyGatewayJWT } from '@/lib/gateway-jwt';

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://www.aiden.services';

const PUBLIC_ROUTES = ['/api/auth', '/_next', '/favicon.ico', '/subscribe'];

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Tier 1: Check Gateway JWT cookie (~2ms)
  const token = request.cookies.get('aiden-gw')?.value;
  if (token) {
    const user = await verifyGatewayJWT(token);
    if (user) {
      // Check email allowlist
      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        if (!pathname.startsWith('/subscribe')) {
          return NextResponse.redirect(new URL('/subscribe', request.url));
        }
      }
      return NextResponse.next();
    }
  }

  // Tier 2: Try Gateway session endpoint (forwards sb-* cookies)
  try {
    const sessionRes = await fetch(`${GATEWAY_URL}/api/auth/session`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    if (sessionRes.ok) {
      const response = NextResponse.next();
      // Forward any set-cookie headers from Gateway (new JWT)
      const setCookie = sessionRes.headers.getSetCookie();
      for (const cookie of setCookie) {
        response.headers.append('set-cookie', cookie);
      }
      return response;
    }
  } catch {
    // Gateway unreachable, fall through to redirect
  }

  // Tier 3: Redirect to Gateway login
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost';
  const currentUrl = `${proto}://${host}${pathname}`;
  const loginUrl = `${GATEWAY_URL}/login?next=${encodeURIComponent(currentUrl)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
