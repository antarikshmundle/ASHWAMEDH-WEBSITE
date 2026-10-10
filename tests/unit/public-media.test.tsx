import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventCard } from "@/components/cards/event-card";
import { EventDetail } from "@/components/sections/event-detail";
import { buildEvent, eventInventory } from "@/data/events";
import { recordToDetails } from "@/lib/cms/mapping";
import type { EventContentRecord } from "@/lib/cms/schema";
import { eventImageSrc } from "@/lib/media";
import { storageImagePatterns, storageOrigin } from "@/lib/storage-images";
import type { ContentSource, EventDetailsInput } from "@/types/festival";

/**
 * Phase 10.4.4: public rendering of uploaded media — the URL allowlist (src/lib/media.ts), the
 * optimizer configuration (next.config.ts), mapping of stored files and alt text, rendering, and
 * EXIF orientation through Next.js' own optimizer.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const ORIGIN = "https://abcdefghijklmnop.supabase.co";
const UUID = "0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b";
const IMAGES = `${ORIGIN}/storage/v1/object/public/ashwamedh-images/events`;
const good = (slug = "hackathon", name = `${UUID}.webp`) => `${IMAGES}/${slug}/${name}`;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("storage origin and optimizer patterns", () => {
  it("accepts only a plain https project origin", () => {
    expect(storageOrigin(`${ORIGIN}/`)).toBe(ORIGIN);
    expect(storageOrigin(` ${ORIGIN} `)).toBe(ORIGIN);
    for (const bad of [
      undefined,
      "",
      "http://abcdefghijklmnop.supabase.co",
      `${ORIGIN}:8443`,
      `${ORIGIN}/rest/v1`,
      `${ORIGIN}?x=1`,
      `${ORIGIN}#x`,
      "https://user:pass@abcdefghijklmnop.supabase.co",
      "not a url",
      "https://abcdefghijklmnop.supabase.co.",
    ])
      expect(storageOrigin(bad), String(bad)).toBeNull();
  });

  it("allows exactly that host's public event-image folder, without query strings", () => {
    expect(storageImagePatterns(ORIGIN)).toEqual([
      {
        protocol: "https",
        hostname: "abcdefghijklmnop.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/ashwamedh-images/events/**",
        search: "",
      },
    ]);
    expect(storageImagePatterns(undefined)).toEqual([]);
    expect(storageImagePatterns("http://evil.example")).toEqual([]);
  });

  it("next.config allows nothing else to be optimized", async () => {
    vi.stubEnv("SUPABASE_URL", ORIGIN);
    const { default: config } = await import("../../next.config");
    const images = config.images!;
    expect(images.remotePatterns).toEqual(storageImagePatterns(ORIGIN));
    expect(images.localPatterns).toEqual([{ pathname: "/images/events/**", search: "" }]);
    expect(images.maximumRedirects).toBe(0);
    expect(images.maximumResponseBody).toBe(5 * 1024 * 1024);
    expect(images).not.toHaveProperty("domains");
    expect(images.dangerouslyAllowSVG).toBeFalsy();
    expect(images.dangerouslyAllowLocalIP).toBeFalsy();

    // The optimizer's own matcher, with this configuration.
    const { hasRemoteMatch } = await import("next/dist/shared/lib/match-remote-pattern");
    const allowed = (url: string) => hasRemoteMatch([], images.remotePatterns ?? [], new URL(url));
    expect(allowed(good())).toBe(true);
    for (const url of [
      good().replace("https:", "http:"),
      good().replace(".supabase.co", ".supabase.co:444"),
      good().replace("abcdefghijklmnop", "other"),
      `${good()}?v=1`,
      `${ORIGIN}/storage/v1/object/public/ashwamedh-documents/events/hackathon/${UUID}.pdf`,
      `${ORIGIN}/storage/v1/object/public/ashwamedh-staging/events/hackathon/${UUID}.png`,
      `${ORIGIN}/storage/v1/object/sign/ashwamedh-images/events/hackathon/${UUID}.png`,
      `https://evil.example/storage/v1/object/public/ashwamedh-images/events/hackathon/${UUID}.png`,
    ])
      expect(allowed(url), url).toBe(false);

    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", "");
    const { default: offline } = await import("../../next.config");
    expect(offline.images!.remotePatterns).toEqual([]);
  });
});

describe("eventImageSrc — uploaded images", () => {
  const src = (value: string | null, slug = "hackathon") => eventImageSrc(value, slug, ORIGIN);

  it("accepts the exact Storage URL of this event's uploaded image", () => {
    for (const ext of ["jpg", "png", "webp"])
      expect(src(good("hackathon", `${UUID}.${ext}`))).toBe(good("hackathon", `${UUID}.${ext}`));
    expect(src(good("rocketry"), "rocketry")).toBe(good("rocketry"));
  });

  it("rejects other hosts, schemes, ports, credentials and look-alike hosts", () => {
    for (const value of [
      good().replace(ORIGIN, "https://evil.example"),
      good().replace("https:", "http:"),
      good().replace(".supabase.co", ".supabase.co:443"),
      good().replace("https://", "https://user@"),
      good().replace(".supabase.co", ".supabase.co.evil.example"),
      good().replace("abcdefghijklmnop", "ABCDEFGHIJKLMNOP"),
      good().replace("https://", "//"),
    ])
      expect(src(value), value).toBeNull();
    // Without a configured project, no uploaded image is accepted.
    expect(eventImageSrc(good(), "hackathon", null)).toBeNull();
  });

  it("rejects other buckets, other events, unknown slugs and odd paths", () => {
    for (const [value, slug] of [
      [good("rocketry"), "hackathon"], // another event's folder
      [good("not-an-event"), "not-an-event"],
      [good().replace("ashwamedh-images", "ashwamedh-documents"), "hackathon"],
      [good().replace("ashwamedh-images", "ashwamedh-staging"), "hackathon"],
      [good().replace("/object/public/", "/object/sign/"), "hackathon"],
      [good().replace("/object/public/", "/render/image/public/"), "hackathon"],
      [`${IMAGES}/hackathon/sub/${UUID}.png`, "hackathon"],
      [`${IMAGES}/hackathon/../rocketry/${UUID}.png`, "hackathon"],
      [`${IMAGES}/hackathon/%2e%2e/rocketry/${UUID}.png`, "hackathon"],
      [`${IMAGES}/hackathon%2F${UUID}.png`, "hackathon"],
      [`${IMAGES}/hackathon/${UUID}%2Epng`, "hackathon"],
      [`${IMAGES}//hackathon/${UUID}.png`, "hackathon"],
      [`${IMAGES}/Hackathon/${UUID}.png`, "Hackathon"],
    ] as const)
      expect(src(value, slug), value).toBeNull();
  });

  it("rejects query strings, fragments, other names and extensions", () => {
    for (const value of [
      `${good()}?v=2`,
      `${good()}#x`,
      `${good()}/`,
      ` ${good()}`,
      good("hackathon", `${UUID.toUpperCase()}.png`),
      good("hackathon", `${UUID.slice(0, 24)}${UUID.slice(24).toUpperCase()}.png`),
      good("hackathon", `${UUID}.jpeg`),
      good("hackathon", `${UUID}.PNG`),
      good("hackathon", `${UUID}.gif`),
      good("hackathon", `${UUID}.svg`),
      good("hackathon", `${UUID}.png.svg`),
      good("hackathon", `${UUID}.svg.png`),
      good("hackathon", "poster.png"),
      good("hackathon", `${UUID}`),
    ])
      expect(src(value), value).toBeNull();
  });

  it("keeps repository images as before", () => {
    expect(src("/images/events/hackathon.webp")).toBe("/images/events/hackathon.webp");
    expect(src("/images/events/a.png?v=1")).toBeNull();
  });
});

/* ---------- mapping and the domain model ---------- */

const record = (over: Partial<EventContentRecord> = {}): EventContentRecord => ({
  ...{
    event_slug: "hackathon",
    description: null,
    rules: null,
    eligibility: null,
    participation: null,
    team_size: null,
    registration_fee: null,
    event_date: null,
    event_time: null,
    venue: null,
    image_file_id: null,
    image_path: null,
    guidelines_file_id: null,
    guidelines_url: null,
    registration_status: "not-open",
    registration_url: null,
    registration_deadline: null,
    source_kind: "owner-confirmed",
    source_reference: "Test fixture",
    source_date: "2026-10-10",
    event_coordinators: [],
    guidelines_file: null,
    image_file: null,
  },
  ...over,
});
const IMAGE_FILE = { bucket: "ashwamedh-images" as const, path: `events/hackathon/${UUID}.webp` };
const PDF_FILE = { bucket: "ashwamedh-documents" as const, path: `events/hackathon/${UUID}.pdf` };

describe("stored files → public URLs and alt text", () => {
  it("maps an uploaded image with its alt text and an uploaded guidelines PDF", () => {
    const details = recordToDetails(
      record({
        image_file: { ...IMAGE_FILE, alt_text: "Teams presenting at the 2025 hackathon" },
        guidelines_file: PDF_FILE,
      }),
      ORIGIN,
    )!;
    expect(details.image).toBe(good());
    expect(details.imageAlt).toBe("Teams presenting at the 2025 hackathon");
    expect(details.pdf).toBe(
      `${ORIGIN}/storage/v1/object/public/ashwamedh-documents/events/hackathon/${UUID}.pdf`,
    );
    const event = buildEvent(
      eventInventory.find((e) => e.slug === "hackathon")!,
      details,
    );
    expect(eventImageSrc(event.image, event.slug, ORIGIN)).toBe(good());
  });

  it("has no alt text without one, or for repository image paths", () => {
    expect(
      recordToDetails(record({ image_file: { ...IMAGE_FILE, alt_text: null } }), ORIGIN),
    ).toMatchObject({
      image: good(),
      imageAlt: undefined,
    });
    expect(
      recordToDetails(record({ image_path: "/images/events/hackathon.webp" }), ORIGIN),
    ).toMatchObject({ image: "/images/events/hackathon.webp", imageAlt: undefined });
  });

  it("ignores a file reference that is not this event's stored file (fails safe)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const image_file of [
      { bucket: "ashwamedh-documents" as const, path: IMAGE_FILE.path, alt_text: "x" },
      { bucket: "ashwamedh-images" as const, path: `events/rocketry/${UUID}.webp`, alt_text: "x" },
      {
        bucket: "ashwamedh-images" as const,
        path: `events/hackathon/../x/${UUID}.webp`,
        alt_text: "x",
      },
      { bucket: "ashwamedh-images" as const, path: `events/hackathon/${UUID}.svg`, alt_text: "x" },
      { bucket: "ashwamedh-images" as const, path: `events/hackathon/${UUID}xwebp`, alt_text: "x" },
      { bucket: "ashwamedh-images" as const, path: `gallery/${UUID}.webp`, alt_text: "x" },
    ]) {
      const details = recordToDetails(record({ image_file }), ORIGIN);
      expect(details?.image, image_file.path).toBeUndefined();
      expect(details?.imageAlt).toBeUndefined();
    }
    for (const guidelines_file of [
      { bucket: "ashwamedh-images" as const, path: PDF_FILE.path },
      { bucket: "ashwamedh-documents" as const, path: `events/rocketry/${UUID}.pdf` },
      { bucket: "ashwamedh-documents" as const, path: `events/hackathon/${UUID}.html` },
    ])
      expect(recordToDetails(record({ guidelines_file }), ORIGIN)?.pdf).toBeUndefined();
    warn.mockRestore();
  });

  it("buildEvent keeps alt text only with an image, trimmed; blank means decorative", () => {
    const hackathon = eventInventory.find((e) => e.slug === "hackathon")!;
    const source: ContentSource = {
      kind: "owner-confirmed",
      reference: "Test",
      date: "2026-10-10",
    };
    const build = (details: Omit<EventDetailsInput, "source">) =>
      buildEvent(hackathon, { source, ...details });
    expect(build({ image: good(), imageAlt: "  A poster  " }).imageAlt).toBe("A poster");
    expect(build({ image: good(), imageAlt: "   " }).imageAlt).toBeNull();
    expect(build({ imageAlt: "Orphan alt" }).imageAlt).toBeNull();
    expect(buildEvent(hackathon).imageAlt).toBeNull();
  });
});

/* ---------- rendering ---------- */

describe("rendering uploaded media", () => {
  const html = (node: ReactNode) => renderToString(node).replace(/<!-- -->/g, "");
  const hackathon = eventInventory.find((e) => e.slug === "hackathon")!;
  const source: ContentSource = { kind: "owner-confirmed", reference: "Test", date: "2026-10-10" };
  const event = (details: Omit<EventDetailsInput, "source">) =>
    buildEvent(hackathon, { source, ...details });
  const images = (markup: string) => markup.match(/<img [^>]*>/g) ?? [];

  it("renders an uploaded image through the optimizer with its official alt text", () => {
    vi.stubEnv("SUPABASE_URL", ORIGIN);
    for (const markup of [
      html(<EventDetail event={event({ image: good(), imageAlt: "Hackathon poster" })} />),
      html(<EventCard event={event({ image: good(), imageAlt: "Hackathon poster" })} index={0} />),
    ]) {
      const [img] = images(markup);
      expect(img).toBeDefined();
      expect(img).toContain('alt="Hackathon poster"');
      expect(img).toContain(`src="/_next/image?url=${encodeURIComponent(good())}&amp;w=`);
      expect(img).not.toMatch(/srcSet="[^"]*https?:\/\/(?!abcdefghijklmnop)/);
    }
  });

  it('uses alt="" without official alt text, and abstract art for anything not allowed', () => {
    vi.stubEnv("SUPABASE_URL", ORIGIN);
    const [img] = images(html(<EventDetail event={event({ image: good() })} />));
    expect(img).toContain('alt=""');

    for (const image of [
      good().replace(ORIGIN, "https://evil.example"),
      `${good()}?v=1`,
      good("rocketry"),
    ]) {
      const markup = html(<EventDetail event={event({ image, imageAlt: "x" })} />);
      expect(images(markup), image).toEqual([]);
      expect(markup).not.toContain("evil.example");
    }
  });

  it("shows nothing uploaded when SUPABASE_URL is not configured", () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect(images(html(<EventDetail event={event({ image: good(), imageAlt: "x" })} />))).toEqual(
      [],
    );
  });

  it("links an uploaded guidelines PDF; Coming Soon without one", () => {
    const pdf = `${ORIGIN}/storage/v1/object/public/ashwamedh-documents/events/hackathon/${UUID}.pdf`;
    const withPdf = html(<EventDetail event={event({ pdf })} />);
    expect(withPdf).toContain(`href="${pdf}"`);
    const without = html(<EventDetail event={buildEvent(hackathon)} />);
    expect(without).not.toContain("ashwamedh-documents");
    expect(without).toMatch(/Coming Soon/);
  });
});

/* ---------- EXIF orientation through Next.js' optimizer ---------- */

describe("EXIF orientation", () => {
  /** 40 × 20 stored pixels: left half red, right half blue. */
  const halves = () =>
    sharp({ create: { width: 40, height: 20, channels: 3, background: "#ff0000" } }).composite([
      {
        input: {
          create: { width: 20, height: 20, channels: 3, background: "#0000ff" },
        },
        left: 20,
        top: 0,
      },
    ]);
  const rotated = async (orientation: number) =>
    halves().jpeg({ quality: 95 }).withMetadata({ orientation }).toBuffer();
  const colourAt = async (image: Buffer, x: number, y: number) => {
    const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
    const i = (y * info.width + x) * info.channels;
    return data[i]! > 128 && data[i + 2]! < 128 ? "red" : data[i + 2]! > 128 ? "blue" : "other";
  };

  it("the optimizer turns rotated JPEGs upright (orientations 6, 3, 8)", async () => {
    const { optimizeImage } = await import("next/dist/server/image-optimizer");
    const optimize = async (orientation: number) =>
      optimizeImage({
        buffer: await rotated(orientation),
        contentType: "image/webp",
        quality: 75,
        width: 64,
      });

    // 6 = rotate 90° clockwise: 20 × 40, red on top.
    const six = await optimize(6);
    expect((await sharp(six).metadata()).width).toBe(20);
    expect((await sharp(six).metadata()).height).toBe(40);
    expect(await colourAt(six, 10, 5)).toBe("red");
    expect(await colourAt(six, 10, 35)).toBe("blue");
    expect((await sharp(six).metadata()).orientation).toBeUndefined();

    // 3 = rotate 180°: 40 × 20, blue on the left.
    const three = await optimize(3);
    expect((await sharp(three).metadata()).width).toBe(40);
    expect(await colourAt(three, 5, 10)).toBe("blue");
    expect(await colourAt(three, 35, 10)).toBe("red");

    // 8 = rotate 90° counter-clockwise: 20 × 40, blue on top.
    const eight = await optimize(8);
    expect((await sharp(eight).metadata()).height).toBe(40);
    expect(await colourAt(eight, 10, 5)).toBe("blue");
  });

  it("validation reads stored dimensions; the D6 limits do not depend on orientation", async () => {
    const { probeImage } = await import("@/lib/cms/image-dimensions");
    const { checkImageDimensions } = await import("@/lib/cms/upload-policy");
    const probe = probeImage(new Uint8Array(await rotated(6)));
    expect(probe).toMatchObject({ ok: true, width: 40, height: 20 });
    // Rotation swaps the sides; both limits are symmetric, so the decision is the same.
    expect(checkImageDimensions(4096, 3906)).toBe(checkImageDimensions(3906, 4096));
  });
});
