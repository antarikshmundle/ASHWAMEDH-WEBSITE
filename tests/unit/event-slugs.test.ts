import { describe, expect, it } from "vitest";
import {
  buildSlugIndex,
  eventInventory,
  events,
  legacyEventSlugs,
  resolveEventSlug,
  resolveSlug,
} from "@/data/events";
import type { EventIdentity } from "@/types/festival";

/** Test-only inventory: one event renamed from "old-name" (never real data). */
const renamed: EventIdentity[] = [
  {
    slug: "new-name",
    name: "New Name",
    category: "cultural",
    department: null,
    legacySlugs: ["old-name"],
  },
  { slug: "other", name: "Other", category: "sports", department: null },
];

describe("legacy slug redirects (Phase 6.4)", () => {
  it("has no former slugs today — none are invented", () => {
    expect(legacyEventSlugs).toEqual([]);
    expect(eventInventory.every((e) => !("legacySlugs" in e))).toBe(true);
  });

  it("resolves all 39 live slugs as canonical and anything else as unknown", () => {
    for (const { slug } of eventInventory)
      expect(resolveEventSlug(slug)).toEqual({ kind: "canonical", slug });
    for (const slug of ["non-existent-slug", "hackathon-2026", "", "Hackathon"])
      expect(resolveEventSlug(slug).kind).toBe("unknown");
  });

  it("keeps former slugs out of the event records", () => {
    for (const event of events) expect("legacySlugs" in event).toBe(false);
  });

  it("redirects a former slug to its live slug in exactly one hop", () => {
    const index = buildSlugIndex(renamed);
    expect(resolveSlug(index, "old-name")).toEqual({
      kind: "legacy",
      slug: "old-name",
      canonical: "new-name",
    });
    for (const [old, live] of index.legacy) {
      expect(index.legacy.has(live), `${old} → ${live} must land on a live page`).toBe(false);
      expect(resolveSlug(index, live).kind).toBe("canonical");
    }
    expect(resolveSlug(index, "new-name").kind).toBe("canonical");
    expect(resolveSlug(index, "missing").kind).toBe("unknown");
  });

  it("rejects any slug setup that could loop, shadow a page or break a URL", () => {
    const withLegacy = (legacySlugs: string[]): EventIdentity[] => [
      { ...renamed[0]!, legacySlugs },
      renamed[1]!,
    ];
    // A former slug that is also a live slug (would shadow a page / loop).
    expect(() => buildSlugIndex(withLegacy(["other"]))).toThrow(/also a live event slug/);
    expect(() => buildSlugIndex(withLegacy(["new-name"]))).toThrow(/also a live event slug/);
    // The same former slug claimed by two events.
    expect(() =>
      buildSlugIndex([
        { ...renamed[0]!, legacySlugs: ["old-name"] },
        { ...renamed[1]!, legacySlugs: ["old-name"] },
      ]),
    ).toThrow(/two events/);
    // Malformed former slug, and duplicate live slugs.
    expect(() => buildSlugIndex(withLegacy(["Old Name"]))).toThrow(/not a valid slug/);
    expect(() => buildSlugIndex([renamed[1]!, renamed[1]!])).toThrow(/Duplicate event slug/);
  });
});
