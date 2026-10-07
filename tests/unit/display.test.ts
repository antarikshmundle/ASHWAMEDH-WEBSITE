import { describe, expect, it } from "vitest";
import {
  REGISTRATION_OPENING_SOON,
  TBA,
  dateTime,
  fact,
  participation,
  pdfState,
  registrationState,
} from "@/lib/display";
import { toSlug } from "@/lib/slug";

describe("display helpers", () => {
  it("renders TBA for unknown facts", () => {
    expect(fact(null)).toBe(TBA);
    expect(fact("  ")).toBe(TBA);
    expect(fact("Main Hall")).toBe("Main Hall");
    expect(dateTime(null, null)).toBe(TBA);
    expect(dateTime("12 Feb", "10:00")).toBe("12 Feb · 10:00");
  });

  it("derives participation only from official team size", () => {
    expect(participation(null)).toBe(TBA);
    expect(participation("1")).toBe("Individual");
    expect(participation("1–3 members")).toBe("Individual / Team");
    expect(participation("2-4 members")).toBe("Team");
  });

  it("opens registration only with an official link", () => {
    expect(registrationState({ status: "not-open", registrationLink: null })).toEqual({
      kind: "opening-soon",
      label: REGISTRATION_OPENING_SOON,
    });
    expect(registrationState({ status: "open", registrationLink: null }).kind).toBe("opening-soon");
    expect(
      registrationState({ status: "open", registrationLink: "https://forms.gle/x" }).kind,
    ).toBe("open");
    expect(registrationState({ status: "closed", registrationLink: null }).kind).toBe("closed");
  });

  it("shows PDF Coming Soon until a file exists", () => {
    expect(pdfState(null).kind).toBe("coming-soon");
    expect(pdfState("/pdfs/x.pdf").kind).toBe("available");
  });
});

describe("toSlug", () => {
  it("follows the Phase 2 slug rule", () => {
    expect(toSlug("SDGineer (Poster Presentation)")).toBe("sdgineer");
    expect(toSlug("Electrical Engineering / E&P")).toBe("electrical-engineering-e-and-p");
    expect(toSlug("100m Running")).toBe("100m-running");
    expect(toSlug("Blind-C")).toBe("blind-c");
  });
});
