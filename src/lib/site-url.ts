const FALLBACK_SITE_URL = "http://localhost:3000";

/**
 * Normalizes a configured site URL: trims whitespace and trailing slashes,
 * and falls back to localhost when the value is missing or not an http(s) URL.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return FALLBACK_SITE_URL;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return FALLBACK_SITE_URL;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/** Public base URL of the site, configured via NEXT_PUBLIC_SITE_URL (see .env.example). */
export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
