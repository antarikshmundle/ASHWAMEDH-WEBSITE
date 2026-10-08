/**
 * CMS configuration (Phase 10.2). Server-side environment only — no NEXT_PUBLIC_ variables.
 *
 * CMS_CONTENT_SOURCE decides where the public site reads event content from:
 *   - "repository" (default): src/data/events/details.ts, exactly as before. No credentials needed,
 *     so local development, unit tests and builds work without Supabase.
 *   - "database": Supabase PostgreSQL. Credentials are then required, and a missing or invalid
 *     value fails loudly instead of silently publishing repository content.
 */
export interface SupabaseCredentials {
  url: string;
  serviceRoleKey: string;
}

export type ContentSourceMode = "repository" | "database";

export class CmsConfigError extends Error {
  override name = "CmsConfigError";
}

type Env = Partial<Record<string, string | undefined>>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Supabase project URL: https, or http only for a local Supabase (`supabase start`). */
function projectUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const local = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if ((url.protocol !== "https:" && !local) || url.username || url.password) return null;
  if (url.pathname !== "/" || url.search || url.hash) return null;
  return url.origin;
}

/** Credentials when both values are present and valid, otherwise `null`. */
export function readSupabaseCredentials(env: Env = process.env): SupabaseCredentials | null {
  const url = projectUrl(env.SUPABASE_URL);
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || serviceRoleKey.length < 20) return null;
  return { url, serviceRoleKey };
}

/** Credentials or a clear error — for code that cannot work without the database. */
export function requireSupabaseCredentials(env: Env = process.env): SupabaseCredentials {
  const credentials = readSupabaseCredentials(env);
  if (!credentials) {
    throw new CmsConfigError(
      "Supabase is not configured: set SUPABASE_URL (https://<project>.supabase.co) and " +
        "SUPABASE_SERVICE_ROLE_KEY on the server. See docs/architecture/admin-cms.md.",
    );
  }
  return credentials;
}

export function contentSourceMode(env: Env = process.env): ContentSourceMode {
  const value = env.CMS_CONTENT_SOURCE?.trim() || "repository";
  if (value !== "repository" && value !== "database") {
    throw new CmsConfigError(
      `CMS_CONTENT_SOURCE must be "repository" or "database" (got "${value}").`,
    );
  }
  return value;
}
