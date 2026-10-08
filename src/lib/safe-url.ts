/**
 * Safe link targets for official event data (Phase 7 decisions D7-1, D7-8, D7-9).
 * Each helper returns a usable href, or `null` when the value is missing or not allowed —
 * callers treat `null` as "not available" and never render the raw value as a link.
 */

/** Official event PDFs served by the site live in public/docs/ (URL /docs/…). */
export const LOCAL_PDF_DIR = "/docs/";

/** Trimmed value, or `null` when missing or blank (D7-9). */
function trimmed(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

/** Parses an absolute HTTPS URL without credentials or an explicit port; otherwise `null`. */
function httpsUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  return url;
}

/**
 * Official Google Form link (D7-1): HTTPS only, and only
 * `https://docs.google.com/forms/…` or `https://forms.gle/…`.
 * Anything else (http, javascript:, data:, other hosts, relative paths) → `null`.
 */
export function registrationHref(value: string | null | undefined): string | null {
  const t = trimmed(value);
  const url = t ? httpsUrl(t) : null;
  if (!url) return null;

  const isGoogleForm =
    (url.hostname === "docs.google.com" && /^\/forms\/.+/.test(url.pathname)) ||
    (url.hostname === "forms.gle" && url.pathname.length > 1);
  return isGoogleForm ? url.href : null;
}

/**
 * Official event PDF (D7-8): an HTTPS URL, or a site path under /docs/ (public/docs/).
 * Local paths must stay inside /docs/ — no "..", backslashes or protocol-relative "//".
 */
export function pdfHref(value: string | null | undefined): string | null {
  const t = trimmed(value);
  if (!t) return null;

  if (t.startsWith(LOCAL_PDF_DIR)) {
    const unsafe = t.length === LOCAL_PDF_DIR.length || /\.\.|\\|\/\/|[\s?#]/.test(t);
    return unsafe ? null : t;
  }
  return httpsUrl(t)?.href ?? null;
}
