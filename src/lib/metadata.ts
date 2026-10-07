import type { Metadata } from "next";
import { site } from "@/data/site";

/** Site-wide title (also the default Open Graph title). */
export const siteTitle = `${site.name} | ${site.college}, ${site.city}`;

/**
 * Shared Open Graph fields. Next.js replaces (not deep-merges) `openGraph` in nested
 * metadata, so pages that set their own `openGraph` spread this first.
 */
export const baseOpenGraph = {
  type: "website",
  siteName: site.name,
  locale: "en_IN",
} satisfies Metadata["openGraph"];
