import { describe, expect, it } from "vitest";
import { events, getEventBySlug, getEventsByVertical } from "@/data/events";
import { culturalNight, scheduleDays, scheduleRows } from "@/data/festival";
import type { EventRecord } from "@/types/festival";

/** Fields that are official-only and must stay null until official PDFs/forms arrive. */
const OFFICIAL_ONLY: (keyof EventRecord)[] = [
  "description",
  "image",
  "rules",
  "eligibility",
  "teamSize",
  "registrationFee",
  "participation",
  "date",
  "time",
  "venue",
  "coordinators",
  "registrationDeadline",
  "registrationLink",
  "pdf",
];

describe("event inventory (master prompt §6 + decisions log)", () => {
  it("has exactly 14 Technomedh, 15 Cultural and 11 Sports events", () => {
    expect(getEventsByVertical("technomedh")).toHaveLength(14);
    expect(getEventsByVertical("cultural")).toHaveLength(15);
    expect(getEventsByVertical("sports")).toHaveLength(11);
    expect(events).toHaveLength(40);
  });

  it("uses official names (OD-01, OD-02)", () => {
    const names = events.map((e) => e.name);
    expect(names).toContain("Business Ideathon");
    expect(names).toContain("Project Competition");
    expect(names).not.toContain("Ideathon");
    expect(names).not.toContain("Project Exhibition");
  });

  it("has no AI & DS Technomedh event (D3)", () => {
    expect(getEventsByVertical("technomedh").some((e) => e.department === "AI & DS")).toBe(false);
  });

  it("has unique, URL-safe slugs", () => {
    const ids = events.map((e) => e.slug);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(getEventBySlug("sdgineer")?.name).toBe("SDGineer (Poster Presentation)");
  });

  it("gives every non-sports event a department and no sports event one", () => {
    for (const e of events) {
      if (e.category === "sports") expect(e.department).toBeNull();
      else expect(e.department).not.toBeNull();
    }
  });

  it("keeps every official-only field null and registration not open (D2)", () => {
    for (const e of events) {
      for (const field of OFFICIAL_ONLY) expect(e[field], `${e.slug}.${field}`).toBeNull();
      expect(e.status).toBe("not-open");
    }
  });
});

describe("festival content", () => {
  it("lists exactly the four confirmed Cultural Night components (OD-14)", () => {
    expect([...culturalNight.whatsOn]).toEqual([
      "Group Dance",
      "Singing",
      "Solo Dance",
      "Inauguration / Stage Performances",
    ]);
    expect(culturalNight.nights).toHaveLength(2);
    expect(culturalNight.nights.every((n) => n.date === null)).toBe(true);
    expect(culturalNight.registrationLink).toBeNull();
  });

  it("has no invented schedule days, times or venues (OD-04, OD-05)", () => {
    expect(scheduleDays).toBeNull();
    for (const row of scheduleRows) {
      expect(row.time).toBeNull();
      expect(row.venue).toBeNull();
    }
  });
});
