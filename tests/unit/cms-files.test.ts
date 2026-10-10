import { describe, expect, it, vi } from "vitest";
import {
  FILE_RULES,
  sanitizeFilename,
  sniffType,
  storagePath,
  validateUpload,
} from "@/lib/cms/upload-policy";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );
const PDF = bytes("%PDF-1.7\n%%EOF\n");
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
// A real 3 × 2 JPEG: since Phase 10.4 images must have a sound structure and readable dimensions.
const JPEG = new Uint8Array(
  Buffer.from(
    "/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAACAAMDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCcAFI//9k=",
    "base64",
  ),
);
const WEBP = bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ");
const ID = "0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b";

describe("upload policy", () => {
  it("recognises files by content, not by name", () => {
    expect(sniffType(PDF)).toBe("application/pdf");
    expect(sniffType(PNG)).toBe("image/png");
    expect(sniffType(JPEG)).toBe("image/jpeg");
    expect(sniffType(WEBP)).toBe("image/webp");
    for (const other of [
      bytes("<svg onload=alert(1)>"),
      bytes("<!doctype html>"),
      bytes("MZ\x90\x00"),
      bytes("PK\x03\x04"),
      bytes("#!/bin/sh"),
    ])
      expect(sniffType(other)).toBeNull();
  });

  it("accepts a real PDF guidelines document and real images", () => {
    expect(
      validateUpload({
        category: "document",
        filename: "Rocketry Rules.pdf",
        declaredType: "application/pdf",
        bytes: PDF,
      }),
    ).toEqual({
      ok: true,
      mimeType: "application/pdf",
      extension: "pdf",
      bucket: "ashwamedh-documents",
      filename: "Rocketry Rules.pdf",
    });
    expect(
      validateUpload({
        category: "event-image",
        filename: "poster.JPEG",
        declaredType: "image/jpeg",
        bytes: JPEG,
      }),
    ).toMatchObject({ ok: true, extension: "jpg", bucket: "ashwamedh-images" });
  });

  it("rejects spoofed, executable, unsupported and oversized files", () => {
    const check = (
      category: Parameters<typeof validateUpload>[0]["category"],
      filename: string,
      declaredType: string,
      data: Uint8Array,
    ) => validateUpload({ category, filename, declaredType, bytes: data });
    expect(
      check("document", "rules.pdf", "application/pdf", bytes("<html><script>")),
    ).toMatchObject({ ok: false });
    expect(check("document", "rules.pdf", "application/pdf", bytes("MZ\x90"))).toMatchObject({
      ok: false,
    });
    expect(check("document", "rules.exe", "application/pdf", PDF)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/extension/),
    });
    expect(check("document", "rules.pdf", "text/html", PDF)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/do not match/),
    });
    expect(check("document", "poster.png", "image/png", PNG)).toMatchObject({ ok: false });
    expect(check("event-image", "logo.svg", "image/svg+xml", bytes("<svg>"))).toMatchObject({
      ok: false,
    });
    expect(check("event-image", "rules.pdf", "application/pdf", PDF)).toMatchObject({ ok: false });
    expect(check("document", "empty.pdf", "application/pdf", new Uint8Array())).toMatchObject({
      ok: false,
      error: expect.stringMatching(/empty/),
    });
    const big = new Uint8Array(FILE_RULES.document.maxBytes + 1);
    big.set(PDF);
    expect(check("document", "big.pdf", "application/pdf", big)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/larger/),
    });
    const bigImage = new Uint8Array(FILE_RULES["event-image"].maxBytes + 1);
    bigImage.set(PNG);
    expect(check("event-image", "big.png", "image/png", bigImage)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/larger/),
    });
  });

  it("rejects path traversal and unsafe names; never uses the name for storage", () => {
    for (const bad of [
      "../../etc/passwd.pdf",
      "..\\boot.pdf",
      "a/b.pdf",
      ".htaccess",
      "x\u0000.pdf",
      "",
      " ",
      "x".repeat(201) + ".pdf",
    ])
      expect(sanitizeFilename(bad), JSON.stringify(bad)).toBeNull();
    expect(sanitizeFilename("  Guidelines   2026.pdf ")).toBe("Guidelines 2026.pdf");
    expect(storagePath("document", ID, "pdf", "rocketry")).toBe(`events/rocketry/${ID}.pdf`);
    expect(storagePath("gallery-image", ID, "webp")).toBe(`gallery/${ID}.webp`);
    expect(() => storagePath("document", ID, "pdf", "../secret")).toThrow(/Unknown event/);
    expect(() => storagePath("document", ID, "pdf", "not-an-event")).toThrow(/Unknown event/);
    expect(() => storagePath("document", "../../x", "pdf", "rocketry")).toThrow(/file id/);
    expect(() => storagePath("document", ID, "php", "rocketry")).toThrow(/extension/);
    expect(() => storagePath("team-image", ID, "png", "rocketry")).toThrow(/not attached/);
  });
});

/* ---------- Admin session (used by the revalidation helper) ---------- */

class Redirect extends Error {}
let signedIn = false;
vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: async () => {
    if (!signedIn) throw new Redirect("/admin/login");
    return { sub: "admin" };
  },
}));

/* ---------- Revalidation ---------- */

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag: (tag: string) => updateTag(tag) }));

describe("targeted revalidation", () => {
  it("expires only that event and the listings, for signed-in admins and real slugs", async () => {
    const { expireEventContent } = await import("@/lib/cms/revalidate");
    signedIn = false;
    await expect(expireEventContent("rocketry")).rejects.toBeInstanceOf(Redirect);
    expect(updateTag).not.toHaveBeenCalled();
    signedIn = true;
    await expireEventContent("rocketry");
    expect(updateTag.mock.calls.map((c) => c[0])).toEqual(["cms:event:rocketry", "cms:events"]);
    await expect(expireEventContent("not-an-event")).rejects.toThrow(/Unknown event/);
  });
});
