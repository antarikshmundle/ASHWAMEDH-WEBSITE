import { describe, expect, it } from "vitest";
import {
  REGISTRATION_OPENING_SOON,
  TBA,
  dateTime,
  fact,
  participationLabel,
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

  it("labels participation only as officially stated (never derived from team size)", () => {
    expect(participationLabel(null)).toBe(TBA);
    expect(participationLabel("individual")).toBe("Individual");
    expect(participationLabel("team")).toBe("Team");
    expect(participationLabel("individual-or-team")).toBe("Individual / Team");
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
