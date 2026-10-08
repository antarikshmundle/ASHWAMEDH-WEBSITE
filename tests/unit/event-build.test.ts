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
    expect(events).toHaveLength(40);
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

  describe("registration and PDF (Phase 7.3)", () => {
    const FORM = "https://forms.gle/AbC123xyz";
    const build = (details: Omit<EventDetailsInput, "source">) =>
      buildEvent(identity, { source, ...details });

    it("keeps an open registration with a valid Google Form link", () => {
      const record = build({
        registrationLink: FORM,
        registrationDeadline: "Nov 20",
        status: "open",
      });
      expect(record.registrationLink).toBe(FORM);
      expect(record.registrationDeadline).toBe("Nov 20");
      expect(record.status).toBe("open");
    });

    it("normalizes registration values: trims, and blank becomes null (D7-9)", () => {
      const record = build({ registrationLink: `  ${FORM} `, registrationDeadline: "  Nov 20 " });
      expect(record.registrationLink).toBe(FORM);
      expect(record.registrationDeadline).toBe("Nov 20");
      const blank = build({ registrationLink: "   ", registrationDeadline: " ", pdf: "  " });
      expect(blank.registrationLink).toBeNull();
      expect(blank.registrationDeadline).toBeNull();
      expect(blank.pdf).toBeNull();
    });

    it("defaults to not-open, even when a valid link is already known (D7-3)", () => {
      expect(build({}).status).toBe("not-open");
      const linkOnly = build({ registrationLink: FORM });
      expect(linkOnly.status).toBe("not-open");
      expect(linkOnly.registrationLink).toBe(FORM);
    });

    it("keeps a closed registration with or without a link", () => {
      expect(build({ status: "closed", registrationLink: FORM }).status).toBe("closed");
      expect(build({ status: "closed" }).status).toBe("closed");
    });

    it("fails the build when status is open without a valid link (D7-2, D7-3)", () => {
      expect(() => build({ status: "open" })).toThrow(
        /status "open" needs a valid registrationLink/,
      );
      expect(() => build({ status: "open", registrationLink: "  " })).toThrow(/status "open"/);
    });

    it("fails the build for an unsafe or non-Google-Form registration link (D7-1, D7-2)", () => {
      for (const bad of [
        "http://forms.gle/AbC123xyz",
        "javascript:alert(1)",
        "https://evil.example/phish",
        "https://docs.google.com/document/d/abc",
        "/events/hackathon",
      ])
        expect(() => build({ registrationLink: bad }), bad).toThrow(
          /registrationLink .* not allowed/,
        );
    });

    it("accepts https and /docs/ PDF links and rejects anything else (D7-8)", () => {
      expect(build({ pdf: "https://drive.google.com/file/d/abc/view" }).pdf).toBe(
        "https://drive.google.com/file/d/abc/view",
      );
      expect(build({ pdf: " /docs/IT_Hackathon_2026.pdf " }).pdf).toBe(
        "/docs/IT_Hackathon_2026.pdf",
      );
      for (const bad of [
        "http://example.org/a.pdf",
        "data:application/pdf;base64,AA",
        "/docs/../x.pdf",
        "rules.pdf",
      ])
        expect(() => build({ pdf: bad }), bad).toThrow(/pdf .* not allowed/);
    });
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
