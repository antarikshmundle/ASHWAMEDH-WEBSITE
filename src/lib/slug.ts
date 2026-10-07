/**
 * Slug rule (docs/ux/sitemap-and-routes.md): lowercase kebab-case of the official name,
 * text in parentheses dropped, "&" → "and".
 */
export function toSlug(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
