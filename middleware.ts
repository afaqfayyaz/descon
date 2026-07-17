import { NextResponse, type NextRequest } from "next/server";

/**
 * Defense-in-depth session gate.
 *
 * Real authorization lives in each page/action via requirePermission — this
 * layer only checks that a session cookie exists, so a page that forgets its
 * guard is still not silently public. It deliberately does NOT verify the JWT:
 * that would pull auth (and MongoDB) into the edge runtime. A forged cookie
 * gets past this hop and is then rejected by requireSession on the server.
 */

/** Paths reachable without a session. */
const PUBLIC_PREFIXES = [
  "/login",
  "/a/", // tokenised assessment links (self-authenticating)
  "/api/auth", // Auth.js endpoints
  "/api/cron", // guarded by CRON_SECRET instead
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true; // root decides its own redirect
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function hasSessionCookie(request: NextRequest): boolean {
  // Auth.js v5 cookie names (secure prefix on HTTPS deployments).
  return Boolean(
    request.cookies.get("__Secure-authjs.session-token") ??
      request.cookies.get("authjs.session-token"),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname) || hasSessionCookie(request)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next.js internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|css|js)$).*)"],
};
