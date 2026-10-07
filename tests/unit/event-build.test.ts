import { describe, expect, it } from "vitest";
import { buildEvent, eventDetails, eventInventory, events } from "@/data/events";
import type { ContentSource, EventDetailsInput, EventIdentity } from "@/types/festival";

const DETAIL_FIELDS = [
  "description",
  "image",
  "rules",
  "eligibility",
  "participation",
  "teamSize",
  "registrationFee",
  "prizePool",
  "prizeDetails",
  "date",
  "time",
  "venue",
  "coordinators",
  "pdf",
  "registrationLink",
  "registrationDeadline",
] as const;

const identity: EventIdentity = {
  slug: "sample-event",
  name: "Sample Event",
  category: "technomedh",
  department: "Information Technology",
};
const source: ContentSource = { kind: "official-pdf", reference: "sample.pdf", date: "2026-11-02" };

describe("event details registry", () => {
  it("only uses known inventory slugs as keys", () => {
    const slugs = new Set<string>(eventInventory.map((e) => e.slug));
    for (const key of Object.keys(eventDetails)) expect(slugs.has(key), key).toBe(true);
  });

  it("records a valid source for every entry (never invent)", () => {
    for (const [slug, details] of Object.entries(eventDetails)) {
      expect(() => buildEvent({ ...identity, slug }, details)).not.toThrow();
    }
  });

  it("is empty until official content exists — every event keeps null details", () => {
    expect(Object.keys(eventDetails)).toHaveLength(0);
    expect(events).toHaveLength(39);
    for (const record of events) {
      for (const field of DETAIL_FIELDS)
        expect(record[field], `${record.slug}.${field}`).toBeNull();
      expect(record.status).toBe("not-open");
    }
  });

  it("resolves every event with its frozen identity, in order", () => {
    expect(events.map((r) => [r.slug, r.name, r.category, r.department])).toEqual(
      eventInventory.map((e) => [e.slug, e.name, e.category, e.department]),
    );
  });
});

describe("buildEvent", () => {
  it("returns identity + all-null details when there is no entry", () => {
    const record = buildEvent(identity);
    expect(record).toMatchObject(identity);
    for (const field of DETAIL_FIELDS) expect(record[field]).toBeNull();
    expect(record.status).toBe("not-open");
  });

  it("never invents: a source alone adds no content", () => {
    const record = buildEvent(identity, { source });
    for (const field of DETAIL_FIELDS) expect(record[field]).toBeNull();
  });

  it("keeps prize pool (chip) and prize details (tab) separate", () => {
    const record = buildEvent(identity, {
      source,
      prizePool: "₹10,000",
      prizeDetails: ["Winner: ₹6,000", "Runner-up: ₹4,000"],
    });
    expect(record.prizePool).toBe("₹10,000");
    expect(record.prizeDetails).toEqual(["Winner: ₹6,000", "Runner-up: ₹4,000"]);
  });

  it("trims values and turns blank values and empty lists into null", () => {
    const record = buildEvent(identity, {
      source,
      description: ["  First paragraph. ", " ", "Second paragraph."],
      rules: [],
      eligibility: ["  "],
      teamSize: "  2–4 members ",
      venue: "   ",
      participation: "team",
      coordinators: [
        { name: " A. Coordinator ", phone: " +91 98765 43210 ", email: " " },
        { name: "  ", phone: "123", email: null },
      ],
    });
    expect(record.description).toEqual(["First paragraph.", "Second paragraph."]);
    expect(record.rules).toBeNull();
    expect(record.eligibility).toBeNull();
    expect(record.teamSize).toBe("2–4 members");
    expect(record.venue).toBeNull();
    expect(record.participation).toBe("team");
    expect(record.coordinators).toEqual([
      { name: "A. Coordinator", phone: "+91 98765 43210", email: null },
    ]);
  });

  it("passes Phase 7 registration fields through unchanged", () => {
    const details: EventDetailsInput = {
      source,
      registrationLink: "https://forms.gle/example",
      registrationDeadline: "Nov 20",
      status: "open",
    };
    const record = buildEvent(identity, details);
    expect(record.registrationLink).toBe("https://forms.gle/example");
    expect(record.registrationDeadline).toBe("Nov 20");
    expect(record.status).toBe("open");
  });

  it("rejects unknown slugs and missing sources at compile time", () => {
    const typoKey: typeof eventDetails = {
      // @ts-expect-error — "hackaton" is not an inventory slug
      hackaton: { source },
    };
    // @ts-expect-error — every details entry needs a source
    const noSource: EventDetailsInput = { teamSize: "2" };
    expect([typoKey, noSource]).toHaveLength(2);
  });

  it("rejects details without a valid source", () => {
    const bad = (s: unknown) => () =>
      buildEvent(identity, { source: s as ContentSource, teamSize: "2" });
    expect(bad(undefined)).toThrow(/need a source/);
    expect(bad({ kind: "official-pdf", reference: " ", date: "2026-11-02" })).toThrow();
    expect(bad({ kind: "official-pdf", reference: "x.pdf", date: "02/11/2026" })).toThrow();
    expect(bad({ kind: "rumour", reference: "x", date: "2026-11-02" })).toThrow();
  });
});
