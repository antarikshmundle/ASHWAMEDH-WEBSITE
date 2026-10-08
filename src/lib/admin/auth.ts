import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readAdminConfig, type AdminConfig } from "./config";
import { MAX_PASSWORD_LENGTH, verifyPassword } from "./password";
import {
  issueSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_PATH,
  SESSION_TTL_SECONDS,
  verifySessionToken,
  type AdminSession,
} from "./session";

/**
 * Admin data-access layer (Phase 10.1). Every admin page and every admin Server Action calls
 * `requireAdmin()` — the proxy's redirect is only a fast, optimistic first check.
 */

export const LOGIN_PATH = "/admin/login";
export const ADMIN_HOME = "/admin";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: SESSION_COOKIE_PATH,
} as const;

/** The verified admin session for this request, or `null`. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  // Read the cookie first, always: it makes every admin page request-time rendered, even when
  // the build runs without admin configuration (otherwise the redirect would be prerendered).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const config = readAdminConfig();
  return config ? verifySessionToken(token, config) : null;
});

/** Redirects to the sign-in page unless the request carries a valid admin session. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}

const digest = (value: string) => createHash("sha256").update(value.normalize("NFKC")).digest();

/** Constant-time username + password check; the password hash is always computed. */
export async function checkCredentials(
  username: unknown,
  password: unknown,
  config: AdminConfig,
): Promise<boolean> {
  if (typeof username !== "string" || typeof password !== "string") return false;
  if (username.length > 64 || password.length > MAX_PASSWORD_LENGTH) return false;
  const userOk = timingSafeEqual(digest(username.trim()), digest(config.username));
  const passwordOk = await verifyPassword(password, config.passwordHash);
  return userOk && passwordOk;
}

/** Sets the signed session cookie. Call only from a Server Action. */
export async function startAdminSession(config: AdminConfig): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await issueSessionToken(config), {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clears the session cookie (same name, path and flags, expired). Call only from a Server Action. */
export async function endAdminSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
