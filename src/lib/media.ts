import { eventInventory } from "@/data/events";
import { STORAGE_EVENT_IMAGES_PATH, storageOrigin } from "./storage-images";

/**
 * Official event images come from two places, and only these are passed to the image optimizer
 * (next.config.ts allows exactly the same):
 *   - public/images/events/ in the repository (URL /images/events/…);
 *   - since Phase 10.4, images uploaded through the admin, in Supabase Storage:
 *     https://<SUPABASE_URL host>/storage/v1/object/public/ashwamedh-images/events/<slug>/<uuid>.<ext>
 */
export const EVENT_IMAGE_DIR = "/images/events/";

// The server generates these names; nothing else (no query, fragment, encoding or sub-folder).
const STORED_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/**
 * The event image when it is a usable official image, otherwise `null` (→ abstract art).
 * Repository images: site-relative paths inside EVENT_IMAGE_DIR, without query strings or "..".
 * Uploaded images: the exact Storage URL above for THIS event's frozen slug, compared as text
 * (never normalised), so other hosts, buckets, events, encodings or query strings never match.
 */
export function eventImageSrc(
  image: string | null,
  slug: string,
  origin: string | null = storageOrigin(process.env.SUPABASE_URL),
): string | null {
  const value = image?.trim();
  if (!value) return null;
  if (value.startsWith(EVENT_IMAGE_DIR)) {
    return value.includes("?") || value.includes("..") ? null : value;
  }
  if (!origin || !eventInventory.some((identity) => identity.slug === slug)) return null;
  const prefix = `${origin}${STORAGE_EVENT_IMAGES_PATH}${slug}/`;
  if (value !== image || !value.startsWith(prefix)) return null;
  return STORED_NAME.test(value.slice(prefix.length)) ? value : null;
}
