import { describe, expect, it } from "vitest";
import { contactHref } from "@/lib/contact";
import { eventImageSrc } from "@/lib/media";

describe("contactHref", () => {
  it("never links a missing value", () => {
    for (const kind of ["phone", "whatsapp", "email"] as const) {
      expect(contactHref(kind, null)).toBeNull();
      expect(contactHref(kind, "  ")).toBeNull();
    }
  });

  it("builds tel: links from phone numbers", () => {
    expect(contactHref("phone", "+91 98765 43210")).toBe("tel:+919876543210");
    expect(contactHref("phone", "0712-2345678")).toBe("tel:07122345678");
    expect(contactHref("phone", "call us")).toBeNull();
  });

  it("builds WhatsApp links only from international numbers (no guessed country code)", () => {
    expect(contactHref("whatsapp", "+91 98765 43210")).toBe("https://wa.me/919876543210");
    expect(contactHref("whatsapp", "98765 43210")).toBeNull();
  });

  it("builds mailto: links from email addresses", () => {
    expect(contactHref("email", "fest@example.org")).toBe("mailto:fest@example.org");
    expect(contactHref("email", "not an email")).toBeNull();
  });
});

describe("eventImageSrc", () => {
  it("falls back (null) when there is no image", () => {
    expect(eventImageSrc(null)).toBeNull();
    expect(eventImageSrc(" ")).toBeNull();
  });

  it("accepts official images in /images/events/", () => {
    expect(eventImageSrc("/images/events/hackathon.webp")).toBe("/images/events/hackathon.webp");
  });

  it("rejects paths the image optimizer is not configured for", () => {
    expect(eventImageSrc("https://example.org/a.jpg")).toBeNull();
    expect(eventImageSrc("/logos/pce-logo.png")).toBeNull();
    expect(eventImageSrc("/images/events/a.jpg?v=2")).toBeNull();
    expect(eventImageSrc("/images/events/../../secret.png")).toBeNull();
  });
});
