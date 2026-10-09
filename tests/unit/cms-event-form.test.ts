import { describe, expect, it } from "vitest";
import { eventInventory } from "@/data/events";
import { buildEvent } from "@/data/events/build";
import {
  LIMITS,
  parseEventForm,
  recordToFormValues,
  validateEventForm,
  type EventFormValues,
} from "@/lib/cms/event-form";
import { identityToSeedRows, recordToDetails } from "@/lib/cms/mapping";
import type { EventContentRecord } from "@/lib/cms/schema";

const identity = eventInventory.find((e) => e.slug === "hackathon")!;
const TODAY = new Date("2026-10-09T12:00:00Z");
const FORM = "https://forms.gle/AbC123xyz";
const SOURCE = {
  sourceKind: "official-form",
  sourceReference: "IT Hackathon form",
  sourceDate: "2026-10-08",
};

const empty = (): EventFormValues => recordToFormValues(null);
const values = (extra: Partial<EventFormValues> = {}): EventFormValues => ({
  ...empty(),
  ...extra,
});
const check = (extra: Partial<EventFormValues>, options = {}) =>
  validateEventForm(identity, values(extra), { today: TODAY, ...options });
const errorsOf = (extra: Partial<EventFormValues>, options = {}) => {
  const result = check(extra, options);
  return result.ok ? {} : result.errors;
};

describe("event form — parsing", () => {
  it("reads every field and coordinator rows in order", () => {
    const data = new FormData();
    data.set("venue", " Main Auditorium ");
    data.set("registrationStatus", "closed");
    for (const [n, p] of [
      ["A", "+91 98765 43210"],
      ["B", ""],
    ]) {
      data.append("coordinatorName", n!);
      data.append("coordinatorDesignation", "");
      data.append("coordinatorPhone", p!);
      data.append("coordinatorEmail", "");
    }
    const parsed = parseEventForm(data);
    expect(parsed).toMatchObject({
      venue: " Main Auditorium ",
      registrationStatus: "closed",
      description: "",
    });
    expect(parsed.coordinators.map((c) => [c.name, c.phone])).toEqual([
      ["A", "+91 98765 43210"],
      ["B", ""],
    ]);
  });

  it("never carries identity, prize or Cultural Night registration fields", () => {
    const fields = Object.keys(empty());
    for (const forbidden of [
      "slug",
      "name",
      "department",
      "category",
      "vertical",
      "prize",
      "prizePool",
      "image",
    ])
      expect(fields).not.toContain(forbidden);
    expect(fields.some((f) => /prize/i.test(f))).toBe(false);
  });
});

describe("event form — NULL / TBA", () => {
  it("an empty form saves NULL everywhere, not-open, and no source", () => {
    const result = check({});
    expect(result).toMatchObject({ ok: true, coordinators: [] });
    if (!result.ok) return;
    for (const [column, value] of Object.entries(result.content))
      expect(value, column).toBe(column === "registration_status" ? "not-open" : null);
  });

  it("trims, collapses spaces and turns blanks into NULL — never placeholder text", () => {
    const result = check({ venue: "  Main   Auditorium ", teamSize: "   ", ...SOURCE });
    expect(result.ok && result.content).toMatchObject({
      venue: "Main Auditorium",
      team_size: null,
    });
  });

  it("splits paragraphs on blank lines and rules on lines", () => {
    const result = check({
      description: "First line\ncontinues.\n\n\nSecond paragraph.\n\n  ",
      rules: "Rule one\n\n  Rule two  \n",
      ...SOURCE,
    });
    expect(result.ok && result.content).toMatchObject({
      description: ["First line continues.", "Second paragraph."],
      rules: ["Rule one", "Rule two"],
    });
  });
});

describe("event form — registration rules (D7)", () => {
  it("accepts open only with an official Google Form", () => {
    expect(check({ registrationStatus: "open", registrationUrl: FORM, ...SOURCE }).ok).toBe(true);
    expect(errorsOf({ registrationStatus: "open", ...SOURCE }).registrationStatus).toMatch(
      /only be open/,
    );
  });

  it("rejects any other registration link", () => {
    for (const bad of [
      "https://evil.example/form",
      "http://forms.gle/AbC",
      "javascript:alert(1)",
      "/events/x",
      "forms.gle/x",
    ])
      expect(errorsOf({ registrationUrl: bad, ...SOURCE }).registrationUrl, bad).toMatch(
        /Google Form/,
      );
  });

  it("allows a known link while registration is not open or closed", () => {
    for (const status of ["not-open", "closed"])
      expect(
        check({ registrationStatus: status, registrationUrl: FORM, ...SOURCE }).ok,
        status,
      ).toBe(true);
  });

  it("refuses statuses that do not exist (no 'completed')", () => {
    expect(
      errorsOf({ registrationStatus: "completed", ...SOURCE }).registrationStatus,
    ).toBeDefined();
  });

  it("accepts guidelines as https or /docs/ only", () => {
    expect(check({ guidelinesUrl: "/docs/IT_Hackathon_2026.pdf", ...SOURCE }).ok).toBe(true);
    expect(check({ guidelinesUrl: "https://example.org/rules.pdf", ...SOURCE }).ok).toBe(true);
    for (const bad of [
      "http://example.org/a.pdf",
      "/docs/../x.pdf",
      "rules.pdf",
      "data:application/pdf;base64,AA",
    ])
      expect(errorsOf({ guidelinesUrl: bad, ...SOURCE }).guidelinesUrl, bad).toBeDefined();
  });
});

describe("event form — provenance (ContentSource)", () => {
  it("requires a complete source as soon as anything is entered", () => {
    const errors = errorsOf({ venue: "Hall A" });
    expect(Object.keys(errors).sort()).toEqual(["sourceDate", "sourceKind", "sourceReference"]);
    expect(errorsOf({ registrationStatus: "closed" }).sourceKind).toBeDefined();
  });

  it("requires a source when the event already has an image or file (Phase 10.4 fields)", () => {
    expect(errorsOf({}, { hasManagedFiles: true }).sourceKind).toBeDefined();
  });

  it("rejects invalid and future source dates", () => {
    for (const bad of ["08/10/2026", "2026-02-30", "2026-10-12"])
      expect(
        errorsOf({ venue: "Hall A", ...SOURCE, sourceDate: bad }).sourceDate,
        bad,
      ).toBeDefined();
  });

  it("keeps a complete source on its own; rejects a partial one", () => {
    expect(check(SOURCE).ok).toBe(true);
    expect(errorsOf({ sourceReference: "Only a reference" }).sourceKind).toBeDefined();
  });
});

describe("event form — coordinators", () => {
  const row = (name: string, extra: object = {}) => ({
    name,
    designation: "",
    phone: "",
    email: "",
    ...extra,
  });

  it("drops empty rows, keeps order, and validates phone / email", () => {
    const result = check({
      coordinators: [
        row(""),
        row("A. Coordinator", { designation: "Faculty Coordinator", phone: "+91 98765 43210" }),
        row("B", { email: "b@pce.ac.in" }),
      ],
      ...SOURCE,
    });
    expect(result.ok && result.coordinators).toEqual([
      {
        name: "A. Coordinator",
        designation: "Faculty Coordinator",
        phone: "+91 98765 43210",
        email: null,
        sort_order: 0,
      },
      { name: "B", designation: null, phone: null, email: "b@pce.ac.in", sort_order: 1 },
    ]);
  });

  it("reports errors on the row the admin sees", () => {
    const errors = errorsOf({
      coordinators: [row(""), row("X", { phone: "call me" }), row("", { email: "nope" })],
      ...SOURCE,
    });
    expect(errors["coordinators.1.phone"]).toBeDefined();
    expect(errors["coordinators.2.name"]).toBeDefined();
    expect(errors["coordinators.2.email"]).toBeDefined();
  });

  it("limits the number of coordinators", () => {
    const many = Array.from({ length: LIMITS.coordinators + 1 }, (_, i) => row(`C${i}`));
    expect(errorsOf({ coordinators: many, ...SOURCE }).coordinators).toBeDefined();
  });
});

describe("event form — limits", () => {
  it("enforces field lengths and list sizes", () => {
    expect(errorsOf({ venue: "x".repeat(LIMITS.venue + 1), ...SOURCE }).venue).toBeDefined();
    expect(errorsOf({ teamSize: "x".repeat(LIMITS.short + 1), ...SOURCE }).teamSize).toBeDefined();
    expect(
      errorsOf({
        rules: Array.from({ length: LIMITS.items + 1 }, (_, i) => `R${i}`).join("\n"),
        ...SOURCE,
      }).rules,
    ).toBeDefined();
    expect(
      errorsOf({ description: "x".repeat(LIMITS.item + 1), ...SOURCE }).description,
    ).toBeDefined();
  });
});

describe("event form — round trip with the public builder", () => {
  it("stored values re-open in the form and build the same public record", () => {
    const result = check({
      description: "Para one.\n\nPara two.",
      rules: "R1\nR2",
      participation: "team",
      teamSize: "2–4 members",
      venue: "Main Auditorium",
      registrationStatus: "open",
      registrationUrl: FORM,
      registrationDeadline: "Nov 20",
      guidelinesUrl: "/docs/IT_Hackathon_2026.pdf",
      coordinators: [{ name: "A. Coordinator", designation: "", phone: "", email: "a@pce.ac.in" }],
      ...SOURCE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const record: EventContentRecord = {
      ...identityToSeedRows(identity, undefined).event,
      ...result.content,
      event_coordinators: result.coordinators,
      guidelines_file: null,
      image_file: null,
    };
    const reopened = recordToFormValues(record);
    expect(validateEventForm(identity, reopened, { today: TODAY })).toEqual(result);
    const built = buildEvent(identity, recordToDetails(record, "https://x.supabase.co"));
    expect(built).toMatchObject({
      venue: "Main Auditorium",
      status: "open",
      registrationLink: FORM,
      teamSize: "2–4 members",
      pdf: "/docs/IT_Hackathon_2026.pdf",
    });
    expect(built.coordinators).toEqual([
      { name: "A. Coordinator", designation: null, phone: null, email: "a@pce.ac.in" },
    ]);
  });
});
