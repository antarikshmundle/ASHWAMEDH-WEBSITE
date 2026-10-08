import { parsePasswordHash } from "./password";

/**
 * Admin sign-in configuration (Phase 10.1), read from server-side environment variables only.
 * Nothing here is ever sent to the browser: none of the names start with NEXT_PUBLIC_.
 */
export interface AdminConfig {
  username: string;
  passwordHash: string;
  sessionSecret: string;
}

export const MIN_SESSION_SECRET_LENGTH = 32;

type Env = Partial<Record<string, string | undefined>>;

/**
 * The complete admin configuration, or `null` when any part is missing or invalid. With `null`,
 * sign-in is refused — there is no default account and no fallback password.
 */
export function readAdminConfig(env: Env = process.env): AdminConfig | null {
  const username = env.ADMIN_USERNAME?.trim() ?? "";
  const passwordHash = env.ADMIN_PASSWORD_HASH?.trim() ?? "";
  const sessionSecret = env.ADMIN_SESSION_SECRET?.trim() ?? "";
  if (!username || username.length > 64) return null;
  if (!parsePasswordHash(passwordHash)) return null;
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) return null;
  return { username, passwordHash, sessionSecret };
}
