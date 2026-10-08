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

  it("uses only a validated Google Form link for Register Now (D7-1, D7-3)", () => {
    expect(
      registrationState({ status: "open", registrationLink: "  https://forms.gle/AbC123xyz " }),
    ).toEqual({ kind: "open", label: "Register Now", href: "https://forms.gle/AbC123xyz" });
    // Defensive fallback (D7-2): unsafe or non-form links never become a CTA.
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,x",
      "http://forms.gle/AbC123xyz",
      "https://evil.example/phish",
      "/events/hackathon",
    ])
      expect(registrationState({ status: "open", registrationLink: bad }).kind, bad).toBe(
        "opening-soon",
      );
    // A link alone does not open registration (D7-3); closed always wins.
    expect(
      registrationState({ status: "not-open", registrationLink: "https://forms.gle/AbC" }).kind,
    ).toBe("opening-soon");
    expect(
      registrationState({ status: "closed", registrationLink: "https://forms.gle/AbC" }),
    ).toEqual({
      kind: "closed",
      label: "Registration Closed",
    });
  });

  it("shows the PDF CTA only for a safe link (D7-8)", () => {
    expect(pdfState(null).kind).toBe("coming-soon");
    expect(pdfState("/docs/IT_Hackathon_2026.pdf")).toEqual({
      kind: "available",
      href: "/docs/IT_Hackathon_2026.pdf",
    });
    expect(pdfState("https://drive.google.com/file/d/abc/view").kind).toBe("available");
    for (const bad of [
      "/pdfs/x.pdf",
      "http://example.org/a.pdf",
      "javascript:alert(1)",
      "/docs/../x.pdf",
    ])
      expect(pdfState(bad), bad).toEqual({ kind: "coming-soon", label: "Event PDF Coming Soon" });
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
