import type { EventIdentity } from "@/types/festival";

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface SlugIndex {
  /** Live event slugs. */
  canonical: ReadonlySet<string>;
  /** Former slug → live slug. */
  legacy: ReadonlyMap<string, string>;
}

export type SlugResolution =
  | { kind: "canonical"; slug: string }
  | { kind: "legacy"; slug: string; canonical: string }
  | { kind: "unknown"; slug: string };

/**
 * Builds the slug lookups and fails loudly on anything that could break a URL: a duplicate
 * live slug, a malformed or duplicate former slug, or a former slug that is also a live one.
 * Because a former slug can never be a live slug, every redirect is exactly one hop — no loops.
 */
export function buildSlugIndex(inventory: readonly EventIdentity[]): SlugIndex {
  const canonical = new Set<string>();
  for (const { slug } of inventory) {
    if (canonical.has(slug)) throw new Error(`Duplicate event slug "${slug}".`);
    canonical.add(slug);
  }

  const legacy = new Map<string, string>();
  for (const { slug, legacySlugs = [] } of inventory) {
    for (const old of legacySlugs) {
      if (!SLUG_FORMAT.test(old)) throw new Error(`Legacy slug "${old}" is not a valid slug.`);
      if (canonical.has(old)) throw new Error(`Legacy slug "${old}" is also a live event slug.`);
      if (legacy.has(old)) throw new Error(`Legacy slug "${old}" is listed for two events.`);
      legacy.set(old, slug);
    }
  }
  return { canonical, legacy };
}

export function resolveSlug(index: SlugIndex, slug: string): SlugResolution {
  if (index.canonical.has(slug)) return { kind: "canonical", slug };
  const target = index.legacy.get(slug);
  return target ? { kind: "legacy", slug, canonical: target } : { kind: "unknown", slug };
}
