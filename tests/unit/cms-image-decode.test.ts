import { crc32, deflateSync } from "node:zlib";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { probeImage } from "@/lib/cms/image-dimensions";
import { verifyImageDecodes } from "@/lib/cms/image-decode";

/**
 * Phase 10.4.3: the bounded full decode (sharp/libvips) that follows the header checks. Real
 * images are generated here; the damaged ones keep a sound structure, so only decoding finds them.
 */

const be32 = (n: number) =>
  Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  return Buffer.concat([be32(data.length), body, be32(crc32(body))]);
};
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IEND = chunk("IEND", Buffer.alloc(0));
const ihdr = (w: number, h: number) =>
  chunk("IHDR", Buffer.concat([be32(w), be32(h), Buffer.from([8, 2, 0, 0, 0])]));
/** An RGB PNG whose IDAT is any (zlib) payload; the CRCs are right, so the structure is sound. */
const png = (w: number, h: number, idat: Buffer) =>
  new Uint8Array(Buffer.concat([SIG, ihdr(w, h), chunk("IDAT", idat), IEND]));

/** Deterministic noise (fixed seed): compresses poorly, like a photo, and is the same every run. */
const noise = (w: number, h: number) => {
  let seed = w * 7919 + h;
  const pixels = Buffer.alloc(w * h * 3);
  for (let i = 0; i < pixels.length; i++)
    pixels[i] = (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 23;
  return sharp(pixels, { raw: { width: w, height: h, channels: 3 } });
};
/** A WebP whose single image chunk keeps only `keep` bytes, with the RIFF and chunk sizes fixed. */
const cutWebp = (webp: Buffer, keep: number) => {
  const out = Buffer.from(webp.subarray(0, 20 + keep));
  out.writeUInt32LE(keep, 16);
  out.writeUInt32LE(out.length - 8, 4);
  return out;
};
const u8 = (b: Buffer) => new Uint8Array(b);

async function verify(bytes: Uint8Array) {
  const probe = probeImage(bytes);
  if (!probe.ok) throw new Error(`fixture is not structurally valid: ${probe.reason}`);
  return verifyImageDecodes(bytes, probe);
}

describe("verifyImageDecodes", () => {
  it("accepts real JPEG, PNG and WebP images", async () => {
    for (const bytes of [
      u8(await noise(120, 80).jpeg().toBuffer()),
      u8(await noise(120, 80).jpeg({ progressive: true }).toBuffer()),
      u8(await noise(120, 80).png().toBuffer()),
      u8(await noise(120, 80).webp().toBuffer()),
      u8(await noise(120, 80).webp({ lossless: true }).toBuffer()),
      png(4, 3, deflateSync(Buffer.alloc(3 * (1 + 4 * 3)))), // filter 0 rows of zeros
    ])
      expect(await verify(bytes)).toEqual({ ok: true });
  });

  it("refuses compressed data that does not decode, though the structure is sound", async () => {
    // PNG: not zlib at all; too few rows; an invalid row filter type.
    expect(await verify(png(30, 20, Buffer.from("not zlib data")))).toMatchObject({ ok: false });
    expect(await verify(png(30, 20, deflateSync(Buffer.alloc(5 * 91))))).toMatchObject({
      ok: false,
    });
    expect(await verify(png(30, 20, deflateSync(Buffer.alloc(20 * 91, 9))))).toMatchObject({
      ok: false,
    });

    // JPEG: the scan cut short, with a proper end marker appended.
    const jpeg = await noise(200, 150).jpeg().toBuffer();
    const scan = jpeg.indexOf(Buffer.from([0xff, 0xda]));
    const short = u8(Buffer.concat([jpeg.subarray(0, scan + 120), Buffer.from([0xff, 0xd9])]));
    expect(await verify(short)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/could not be read/),
    });

    // WebP (lossy and lossless): image data cut short; the container sizes still agree.
    const lossy = await noise(200, 150).webp().toBuffer();
    const firstPartition = lossy.readUIntLE(20, 3) >>> 5;
    const lossyKeep = firstPartition + 10 + ((lossy.readUInt32LE(16) - firstPartition - 10) >> 1);
    const lossless = await noise(60, 40).webp({ lossless: true }).toBuffer();
    for (const broken of [
      cutWebp(lossy, lossyKeep & ~1),
      cutWebp(lossless, (lossless.readUInt32LE(16) >> 2) << 1),
    ])
      expect(await verify(u8(broken))).toMatchObject({ ok: false });
  });

  it("refuses when the decoder disagrees with the header parser", async () => {
    const bytes = u8(await noise(40, 30).png().toBuffer());
    expect(
      await verifyImageDecodes(bytes, { type: "image/png", width: 41, height: 30 }),
    ).toMatchObject({
      ok: false,
    });
    expect(
      await verifyImageDecodes(bytes, { type: "image/webp", width: 40, height: 30 }),
    ).toMatchObject({
      ok: false,
    });
  });

  it("refuses images above 16 megapixels before decoding them", async () => {
    // 4096 × 4096 of zeros compresses to a few kilobytes: a decompression bomb for a naive decoder.
    const bomb = png(4096, 4096, deflateSync(Buffer.alloc(4096 * (1 + 4096 * 3))));
    expect(bomb.length).toBeLessThan(100_000);
    const started = performance.now();
    expect(
      await verifyImageDecodes(bomb, { type: "image/png", width: 4096, height: 4096 }),
    ).toMatchObject({
      ok: false,
    });
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("fails closed when the image library cannot be loaded", async () => {
    vi.resetModules();
    vi.doMock("sharp", () => {
      throw new Error("native module missing");
    });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { verifyImageDecodes: isolated } = await import("@/lib/cms/image-decode");
    const bytes = u8(await noise(10, 10).png().toBuffer());
    expect(await isolated(bytes, { type: "image/png", width: 10, height: 10 })).toEqual({
      ok: false,
      error: expect.stringMatching(/verification is unavailable/),
    });
    errors.mockRestore();
    vi.doUnmock("sharp");
  });
});
