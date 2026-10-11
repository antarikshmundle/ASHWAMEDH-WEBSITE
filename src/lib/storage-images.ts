/**
 * Supabase Storage location of uploaded event images (Phase 10.4.4). No imports: next.config.ts
 * uses it to allow exactly this host and path in the image optimizer (D8), and src/lib/media.ts
 * uses it to accept only such URLs for an event.
 *
 * Shape: https://<project host>/storage/v1/object/public/ashwamedh-images/events/<slug>/<uuid>.<ext>
 */

export const STORAGE_EVENT_IMAGES_PATH = "/storage/v1/object/public/ashwamedh-images/events/";
/** Gallery images (Phase 10.6): gallery/<uuid>.<ext>, no sub-folders. */
export const STORAGE_GALLERY_PATH = "/storage/v1/object/public/ashwamedh-images/gallery/";

/**
 * The project's origin (`https://host`) from SUPABASE_URL, or `null` when it is missing or not a
 * plain https origin (no credentials, port, path, query or fragment).
 */
export function storageOrigin(projectUrl: string | undefined): string | null {
  const value = projectUrl?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return null;
  if (!/^[a-z0-9.-]+$/.test(url.hostname) || url.hostname.endsWith(".")) return null;
  return url.origin;
}

/** next.config `images.remotePatterns`: only that host's public event and gallery image folders, no query. */
export function storageImagePatterns(projectUrl: string | undefined) {
  const origin = storageOrigin(projectUrl);
  if (!origin) return [];
  const hostname = new URL(origin).hostname;
  return [
    {
      protocol: "https" as const,
      hostname,
      port: "",
      pathname: `${STORAGE_EVENT_IMAGES_PATH}**`,
      search: "",
    },
    {
      protocol: "https" as const,
      hostname,
      port: "",
      pathname: `${STORAGE_GALLERY_PATH}*`,
      search: "",
    },
  ];
}
