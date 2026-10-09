import { NextResponse, type NextRequest } from "next/server";
import { eventInventory, legacyEventSlugs } from "@/data/events";
import { readAdminConfig } from "@/lib/admin/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/session";

/** Every URL segment that may reach /events/[slug]: live slugs and former slugs (exact case). */
const EVENT_SLUGS = new Set<string>([...eventInventory.map((e) => e.slug), ...legacyEventSlugs]);

/** Not a route — rewriting here renders the app's static 404 page. */
const NOT_FOUND_PATH = "/_event-not-found";

/**
 * Event pages (Phase 10.3): only exact inventory / former slugs reach /events/[slug]. Anything
 * else gets the 404 page without rendering the event route, so unknown or wrongly-cased URLs are
 * never rendered or cached as event pages (the route keeps dynamicParams on so that saved CMS
 * content can regenerate its page).
 */
function guardEventPage(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice("/events/".length);
  return EVENT_SLUGS.has(slug)
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

/**
 * Admin routes (Phase 10.1) — optimistic check: no valid session → sign-in page; signed in → skip
 * the sign-in page. The real check is `requireAdmin()` in every admin page and action
 * (src/lib/admin/auth.ts).
 */
async function guardAdmin(request: NextRequest) {
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

export async function proxy(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/events/")
    ? guardEventPage(request)
    : guardAdmin(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/events/:slug"],
};
