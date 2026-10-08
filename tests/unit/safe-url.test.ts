import { describe, expect, it } from "vitest";
import { pdfHref, registrationHref } from "@/lib/safe-url";

describe("registrationHref (D7-1, D7-9)", () => {
  it("accepts official Google Form links over HTTPS", () => {
    expect(registrationHref("https://forms.gle/AbC123xyz")).toBe("https://forms.gle/AbC123xyz");
    expect(registrationHref("https://docs.google.com/forms/d/e/1FAIpQLSf_example/viewform")).toBe(
      "https://docs.google.com/forms/d/e/1FAIpQLSf_example/viewform",
    );
    expect(registrationHref("https://docs.google.com/forms/d/abc/viewform?usp=sf_link")).toBe(
      "https://docs.google.com/forms/d/abc/viewform?usp=sf_link",
    );
  });

  it("trims whitespace and treats blank values as missing", () => {
    expect(registrationHref("  https://forms.gle/AbC123xyz \n")).toBe(
      "https://forms.gle/AbC123xyz",
    );
    for (const blank of [null, undefined, "", "   "]) expect(registrationHref(blank)).toBeNull();
  });

  it("rejects unsafe schemes", () => {
    for (const bad of [
      "javascript:alert(1)",
      " JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "http://forms.gle/AbC123xyz",
      "http://docs.google.com/forms/d/abc/viewform",
      "ftp://forms.gle/AbC123xyz",
    ])
      expect(registrationHref(bad), bad).toBeNull();
  });

  it("rejects anything that is not an official Google Form", () => {
    for (const bad of [
      "https://evil.example/phish",
      "https://docs.google.com.evil.example/forms/d/abc",
      "https://forms.gle.evil.example/AbC",
      "https://docs.google.com/document/d/abc/edit",
      "https://docs.google.com/forms",
      "https://docs.google.com/forms/",
      "https://forms.gle/",
      "https://forms.google.com/abc",
      "https://user:pass@forms.gle/AbC123xyz",
      "https://forms.gle:8443/AbC123xyz",
      "//forms.gle/AbC123xyz",
      "/events/hackathon",
      "forms.gle/AbC123xyz",
      "not a url",
    ])
      expect(registrationHref(bad), bad).toBeNull();
  });
});

describe("pdfHref (D7-8, D7-9)", () => {
  it("accepts HTTPS URLs and site paths under /docs/", () => {
    expect(pdfHref("https://drive.google.com/file/d/abc/view")).toBe(
      "https://drive.google.com/file/d/abc/view",
    );
    expect(pdfHref("/docs/IT_Hackathon_2026.pdf")).toBe("/docs/IT_Hackathon_2026.pdf");
    expect(pdfHref("  /docs/technomedh/Rocketry.pdf ")).toBe("/docs/technomedh/Rocketry.pdf");
  });

  it("treats blank values as missing", () => {
    for (const blank of [null, undefined, "", "  "]) expect(pdfHref(blank)).toBeNull();
  });

  it("rejects unsafe schemes and paths outside /docs/", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:application/pdf;base64,AAAA",
      "http://example.org/rules.pdf",
      "https://user:pass@example.org/rules.pdf",
      "//example.org/rules.pdf",
      "/docs/",
      "/docs/../secret.pdf",
      "/docs/a/../../secret.pdf",
      "/docs//evil.example/x.pdf",
      "/docs\\..\\secret.pdf",
      "/docs/rules.pdf?download=1",
      "/docs/IT Hackathon.pdf",
      "/images/events/rules.pdf",
      "docs/rules.pdf",
      "rules.pdf",
    ])
      expect(pdfHref(bad), bad).toBeNull();
  });
});
