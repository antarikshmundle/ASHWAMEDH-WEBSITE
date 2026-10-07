/**
 * Official event images are served from public/images/events/ (URL /images/events/…).
 * This is the only path next.config.ts allows the image optimizer to read (images.localPatterns).
 */
export const EVENT_IMAGE_DIR = "/images/events/";

/**
 * The event image path when it is a usable official image, otherwise `null` (→ abstract art).
 * Accepts only site-relative paths inside EVENT_IMAGE_DIR, without query strings or "..".
 */
export function eventImageSrc(image: string | null): string | null {
  const value = image?.trim();
  if (!value) return null;
  if (!value.startsWith(EVENT_IMAGE_DIR) || value.includes("?") || value.includes("..")) {
    return null;
  }
  return value;
}
