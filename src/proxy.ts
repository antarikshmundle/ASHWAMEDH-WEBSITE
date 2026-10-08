import { NextResponse, type NextRequest } from "next/server";
import { readAdminConfig } from "@/lib/admin/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/session";

/**
 * Admin routes only (Phase 10.1) — the public site never passes through here.
 * Optimistic check: no valid session → sign-in page; signed in → skip the sign-in page.
 * The real check is `requireAdmin()` in every admin page and action (src/lib/admin/auth.ts).
 */
export async function proxy(request: NextRequest) {
  const adminConfig = readAdminConfig();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = adminConfig ? await verifySessionToken(token, adminConfig) : null;
  const onLogin = request.nextUrl.pathname === "/admin/login";

  const response =
    !session && !onLogin
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : session && onLogin
        ? NextResponse.redirect(new URL("/admin", request.url))
        : NextResponse.next();

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
