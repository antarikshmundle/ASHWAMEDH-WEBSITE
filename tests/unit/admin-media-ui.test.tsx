import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MediaFileSummary } from "@/types/admin-media";

/**
 * Phase 10.4.5: the admin media panels and the editor shell, rendered on the server. Interactive
 * flows (upload, confirm, progress) are covered by the browser check in the QA report; here every
 * state's markup, labels, accessibility attributes and the D3 / D7 blocking are pinned down.
 */

vi.mock("@/app/admin/events/media-actions", () => ({
  requestMediaUploadAction: vi.fn(),
  finalizeMediaUploadAction: vi.fn(),
  removeEventMediaAction: vi.fn(),
  updateEventImageAltAction: vi.fn(),
}));
vi.mock("@/app/admin/events/actions", () => ({ editorAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const html = (node: ReactNode) => renderToString(node).replace(/<!-- -->/g, "");
const URL_ = "https://abcdefghijklmnop.supabase.co/storage/v1/object/public";
const IMAGE: MediaFileSummary = {
  name: "Hackathon poster.png",
  sizeBytes: 1_572_864,
  uploadedLabel: "10 Oct 2026, 1:15 pm IST",
  url: `${URL_}/ashwamedh-images/events/hackathon/0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b.png`,
  width: 1600,
  height: 900,
  altText: "Students presenting projects",
};
const PDF: MediaFileSummary = {
  name: "IT Hackathon rules.pdf",
  sizeBytes: 250_000,
  uploadedLabel: "10 Oct 2026, 1:20 pm IST",
  url: `${URL_}/ashwamedh-documents/events/hackathon/0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b.pdf`,
  width: null,
  height: null,
  altText: null,
};

async function panel(over: Record<string, unknown> = {}) {
  const { MediaPanel } = await import("@/components/admin/media-panel");
  const props = {
    slug: "hackathon",
    kind: "image" as const,
    file: null,
    linked: null,
    version: "2026-10-10T10:00:00+00:00",
    blockedReason: null,
    maxBytes: 5 * 1024 * 1024,
    types: ["image/jpeg", "image/png", "image/webp"],
    onBusyChange: () => {},
    onDone: () => {},
    ...over,
  };
  return html(<MediaPanel {...props} />);
}
const tag = (markup: string, pattern: RegExp) => markup.match(pattern)?.[0] ?? "";
const buttons = (markup: string) =>
  [...markup.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => ({
    tag: m[0],
    text: m[1]!.replace(/<[^>]+>/g, ""),
  }));

describe("media panel — states", () => {
  it("empty image slot: explains the fallback and offers a labelled upload", async () => {
    const markup = await panel();
    expect(markup).toContain("No image — the public site shows the abstract artwork.");
    const input = tag(markup, /<input[^>]*type="file"[^>]*>/);
    expect(input).toContain('accept="image/jpeg,image/png,image/webp"');
    const id = input.match(/id="([^"]+)"/)![1]!;
    expect(markup).toContain(`for="${id}"`);
    expect(markup).toContain(">Upload an image</label>");
    expect(markup).toMatch(
      /JPEG, PNG or WebP, up to 5\.0 MB\. Up to 4096 pixels per side and 16 megapixels\./,
    );
    expect(input).toMatch(/aria-describedby="[^"]*-hint"/);
    // Upload waits for a file; there is nothing to remove.
    const upload = buttons(markup).find((b) => b.text === "Upload image")!;
    expect(upload.tag).toContain("disabled");
    expect(buttons(markup).some((b) => b.text.startsWith("Remove"))).toBe(false);
  });

  it("current image: preview with alt, details, alt-text editor, replace and remove", async () => {
    const markup = await panel({ file: IMAGE });
    const img = tag(markup, /<img [^>]*>/);
    expect(img).toContain('alt="Current event image: Students presenting projects"');
    expect(img).toContain(`/_next/image?url=${encodeURIComponent(IMAGE.url)}`);
    for (const text of [
      "Hackathon poster.png",
      "1.5 MB",
      "1600 × 900 px",
      "10 Oct 2026, 1:15 pm IST",
    ])
      expect(markup).toContain(text);
    expect(markup).toContain("Alt text of the current image");
    expect(tag(markup, /<input[^>]*value="Students presenting projects"[^>]*>/)).toContain(
      'maxLength="300"',
    );
    expect(buttons(markup).map((b) => b.text)).toEqual([
      "Save alt text",
      "Replace image",
      "Remove image",
    ]);
    expect(markup).toContain("Replace with a new image");
  });

  it("current PDF: details and a link that opens it in a new tab", async () => {
    const markup = await panel({
      kind: "guidelines",
      file: PDF,
      maxBytes: 10 * 1024 * 1024,
      types: ["application/pdf"],
    });
    expect(markup).toContain("IT Hackathon rules.pdf");
    expect(markup).toContain("244 KB");
    expect(markup).not.toContain("Dimensions");
    expect(tag(markup, /<a [^>]*>/)).toMatch(
      /href="[^"]+\.pdf" target="_blank" rel="noopener noreferrer"/,
    );
    expect(markup).toContain("(opens in new tab)");
    expect(markup).not.toContain("<img");
    expect(buttons(markup).map((b) => b.text)).toEqual(["Replace PDF", "Remove PDF"]);
  });

  it("a linked path or URL is shown, and uploading replaces it (D2)", async () => {
    const markup = await panel({ kind: "guidelines", linked: "https://example.org/rules.pdf" });
    expect(markup).toContain("Linked instead of uploaded");
    expect(markup).toContain("https://example.org/rules.pdf");
    expect(markup).toContain("Uploading a file replaces this link");
    expect(buttons(markup).map((b) => b.text)).toEqual(["Replace PDF"]);
  });

  it("blocked: every control disabled and pointing at the visible reason (D3 / D7)", async () => {
    const reason = "You have unsaved text changes. Save them first.";
    const markup = await panel({ file: IMAGE, blockedReason: reason });
    const reasonId = markup.match(new RegExp(`id="([^"]+)"[^>]*>${reason}`))![1]!;
    for (const control of [
      tag(markup, /<input[^>]*type="file"[^>]*>/),
      tag(markup, /<input[^>]*value="Students presenting projects"[^>]*>/),
      ...buttons(markup).map((b) => b.tag),
    ]) {
      expect(control).toContain("disabled");
      expect(control).toContain(reasonId);
    }
  });

  it("buttons and the file picker are at least 44 px high", async () => {
    const markup = await panel({ file: IMAGE });
    for (const b of buttons(markup)) expect(b.tag).toMatch(/\bh-11\b/);
    expect(tag(markup, /<input[^>]*type="file"[^>]*>/)).toContain("file:h-11");
  });
});

describe("editor shell — blocking and notices", () => {
  const values = {
    description: "",
    rules: "",
    eligibility: "",
    participation: "",
    teamSize: "",
    registrationFee: "",
    date: "",
    time: "",
    venue: "",
    guidelinesUrl: "",
    registrationStatus: "not-open",
    registrationUrl: "",
    registrationDeadline: "",
    sourceKind: "",
    sourceReference: "",
    sourceDate: "",
    coordinators: [],
  };
  const shell = async (media: Record<string, unknown>) => {
    const { EventEditor } = await import("@/components/admin/event-editor");
    const { LIMITS } = await import("@/lib/cms/event-form");
    return html(
      <EventEditor
        slug="hackathon"
        publicHref="/events/hackathon"
        values={values}
        version="2026-10-10T10:00:00+00:00"
        revisions={[]}
        media={{
          image: null,
          imagePath: null,
          guidelines: null,
          guidelinesUrl: null,
          hasSource: true,
          ...media,
        }}
        mediaLimits={{
          image: { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
          guidelines: { maxBytes: 10 * 1024 * 1024, types: ["application/pdf"] },
        }}
        limits={LIMITS}
      />,
    );
  };

  it("adds an “Event files” section with both panels after the form", async () => {
    const markup = await shell({});
    expect(markup.indexOf("Save changes")).toBeLessThan(markup.indexOf(">Event files</h2>"));
    expect(markup.indexOf(">Event files</h2>")).toBeLessThan(markup.indexOf("Version history"));
    expect(markup).toContain("Changes here apply immediately");
    expect(markup).toContain(">Event image</h3>");
    expect(markup).toContain(">Guidelines PDF</h3>");
    expect(markup).not.toContain("Save the event’s content source");
  });

  it("blocks adding files until the content source is saved (D3)", async () => {
    const markup = await shell({ hasSource: false });
    expect(markup.match(/Save the event’s content source/g)).toHaveLength(2);
  });

  it("points the guidelines link field to the uploaded PDF when one is attached", async () => {
    expect(await shell({ guidelines: PDF })).toContain(
      "An uploaded guidelines PDF is attached (see “Event files” below). Remove it there",
    );
    expect(await shell({})).toContain("or upload the PDF under “Event files” below");
  });

  it("warns clearly when a restored version referred to missing files (D5)", async () => {
    const { NoticeMessage } = await import("@/components/admin/event-editor");
    const one = html(
      <NoticeMessage notice={{ kind: "restored", missing: ["image"] }} publicHref="/events/x" />,
    );
    expect(one).toContain('role="alert"');
    expect(one).toContain("used an event image that no longer exists, so that slot was left empty");
    const both = html(
      <NoticeMessage
        notice={{ kind: "restored", missing: ["image", "guidelines"] }}
        publicHref="/events/x"
      />,
    );
    expect(both).toContain(
      "an event image and a guidelines PDF that no longer exists, so those slots were",
    );
    const none = html(
      <NoticeMessage notice={{ kind: "restored", missing: [] }} publicHref="/events/x" />,
    );
    expect(none).not.toContain('role="alert"');
    expect(none).toContain("Earlier version restored and saved.");
  });
});

describe("guidelines link vs uploaded PDF (server validation)", () => {
  it("refuses a guidelines link while an uploaded PDF is attached", async () => {
    const { validateEventForm } = await import("@/lib/cms/event-form");
    const { eventInventory } = await import("@/data/events");
    const identity = eventInventory.find((e) => e.slug === "hackathon")!;
    const values = {
      description: "",
      rules: "",
      eligibility: "",
      participation: "",
      teamSize: "",
      registrationFee: "",
      date: "",
      time: "",
      venue: "",
      guidelinesUrl: "https://example.org/rules.pdf",
      registrationStatus: "not-open",
      registrationUrl: "",
      registrationDeadline: "",
      sourceKind: "owner-confirmed",
      sourceReference: "Test fixture",
      sourceDate: "2026-10-01",
      coordinators: [],
    };
    const today = new Date("2026-10-10T00:00:00Z");
    const blocked = validateEventForm(identity, values, { hasGuidelinesFile: true, today });
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.errors.guidelinesUrl).toMatch(
      /uploaded guidelines PDF is attached/,
    );
    expect(validateEventForm(identity, values, { today }).ok).toBe(true);
    expect(
      validateEventForm(
        identity,
        { ...values, guidelinesUrl: "" },
        { hasGuidelinesFile: true, today },
      ).ok,
    ).toBe(true);
  });
});
