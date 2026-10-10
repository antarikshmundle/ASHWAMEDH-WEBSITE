import { crc32, deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { probeImage } from "@/lib/cms/image-dimensions";
import {
  FILE_RULES,
  IMAGE_LIMITS,
  checkImageDimensions,
  checkUploadRequest,
  stagingPath,
  validateUpload,
} from "@/lib/cms/upload-policy";

/**
 * Phase 10.4.2: image header checks (image-dimensions.ts) and the media upload policy — D6 pixel
 * limits, the pre-upload request check and staging paths. Fixtures are built byte by byte below;
 * the base64 ones were produced by a real encoder (sharp) and are a few hundred bytes each.
 */

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const u8 = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? ascii(p) : p)));
const b64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const le32 = (n: number) => [...le24(n), (n >>> 24) & 255];

const REAL = {
  jpeg: b64(
    "/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAACAAMDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCcAFI//9k=",
  ),
  jpegProgressive: b64(
    "/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wgARCAAEAAUDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/xAAVAQEBAAAAAAAAAAAAAAAAAAABBf/aAAwDAQACEAMQAAABmBS//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD7/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=",
  ),
  webpLossy: b64("UklGRjAAAABXRUJQVlA4ICQAAABQAQCdASoDAAIAAsBMJaAABAAAAP7qZWz///M0f/JH/sD1UAA="),
  webpLossless: b64("UklGRh4AAABXRUJQVlA4TBEAAAAvAkAAEAdQlCJXq4CBiOh/AAA="),
  webpAlpha: b64(
    "UklGRlIAAABXRUJQVlA4WAoAAAAQAAAAAgAAAQAAQUxQSAcAAAAAgICAgICAAFZQOCAkAAAAUAEAnQEqAwACAALATCWgAAQAAAD+6mVs///zNH/yR/7A9VAA",
  ),
};

/* ---------- PNG builder (CRC from node:zlib, independent of the parser's own) ---------- */

const pngChunk = (type: string, data: number[] = [], crcFix = 0) => {
  const body = Buffer.from([...ascii(type), ...data]);
  return [...be32(data.length), ...body, ...be32((crc32(body) + crcFix) >>> 0)];
};
const ihdr = (w: number, h: number, depth = 8, colour = 2, interlace = 0, method = 0) =>
  pngChunk("IHDR", [...be32(w), ...be32(h), depth, colour, method, 0, interlace]);
// The parser never inflates IDAT, so a small deflate stream stands in for any image size.
const IDAT = pngChunk("IDAT", [...deflateSync(Buffer.alloc(16))]);
const IEND = pngChunk("IEND");
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const png = (w = 3, h = 2, ...middle: number[][]) => u8(PNG_SIG, ihdr(w, h), ...middle, IDAT, IEND);

/* ---------- JPEG builder (structure only; the parser does not decode the scan) ---------- */

const seg = (marker: number, payload: number[]) => [
  0xff,
  marker,
  ...be16(payload.length + 2),
  ...payload,
];
const sof = (w: number, h: number, marker = 0xc0, precision = 8, components = 3) =>
  seg(marker, [
    precision,
    ...be16(h),
    ...be16(w),
    components,
    ...Array.from({ length: components }, (_, i) => [i + 1, 0x11, 0]).flat(),
  ]);
const APP0 = seg(0xe0, [...ascii("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const DQT = seg(0xdb, [0, ...Array<number>(64).fill(1)]);
const DHT = seg(0xc4, [0, 1, ...Array<number>(15).fill(0), 0]);
const SOS = seg(0xda, [1, 1, 0, 0, 63, 0]);
// Entropy-coded bytes with a stuffed 0xFF00 and a restart marker inside the scan.
const SCAN = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56];
const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];
const jpeg = (w = 3, h = 2, frame = sof(w, h)) => u8(SOI, APP0, DQT, frame, DHT, SOS, SCAN, EOI);

/* ---------- WebP builder ---------- */

const webpChunk = (type: string, data: number[]) => [
  ...ascii(type),
  ...le32(data.length),
  ...data,
  ...(data.length & 1 ? [0] : []),
];
const riff = (chunks: number[][], sizeDelta = 0) => {
  const body = chunks.flat();
  return u8("RIFF", le32(4 + body.length + sizeDelta), "WEBP", body);
};
// Key frame, shown, first partition size 0, start code, 14-bit dimensions.
const vp8 = (w: number, h: number, tag = 0x10, start = [0x9d, 0x01, 0x2a]) =>
  webpChunk("VP8 ", [...le24(tag), ...start, ...le16(w), ...le16(h), 0, 0]);
const vp8l = (w: number, h: number, signature = 0x2f, version = 0) =>
  webpChunk("VP8L", [signature, ...le32(((w - 1) | ((h - 1) << 14) | (version << 29)) >>> 0), 0]);
const vp8x = (w: number, h: number, flags = 0) =>
  webpChunk("VP8X", [flags, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)]);

const dims = (bytes: Uint8Array) => {
  const r = probeImage(bytes);
  return r.ok ? [r.type, r.width, r.height] : r.reason;
};

describe("probeImage — valid images", () => {
  it("reads the dimensions of real encoder output (JPEG, progressive JPEG, WebP variants)", () => {
    expect(dims(REAL.jpeg)).toEqual(["image/jpeg", 3, 2]);
    expect(dims(REAL.jpegProgressive)).toEqual(["image/jpeg", 5, 4]);
    expect(dims(REAL.webpLossy)).toEqual(["image/webp", 3, 2]);
    expect(dims(REAL.webpLossless)).toEqual(["image/webp", 3, 2]);
    expect(dims(REAL.webpAlpha)).toEqual(["image/webp", 3, 2]);
  });

  it("reads PNG dimensions for every colour type, bit depth and interlacing", () => {
    expect(dims(png(3, 2))).toEqual(["image/png", 3, 2]);
    for (const [colour, depth] of [
      [0, 1],
      [0, 16],
      [2, 16],
      [4, 8],
      [6, 16],
    ] as const)
      expect(dims(u8(PNG_SIG, ihdr(7, 5, depth, colour), IDAT, IEND))).toEqual(["image/png", 7, 5]);
    expect(dims(u8(PNG_SIG, ihdr(7, 5, 8, 2, 1), IDAT, IEND))).toEqual(["image/png", 7, 5]);
    const palette = pngChunk("PLTE", [0, 0, 0, 255, 255, 255]);
    expect(dims(u8(PNG_SIG, ihdr(7, 5, 4, 3), palette, IDAT, IEND))).toEqual(["image/png", 7, 5]);
    // Ancillary chunks (text, gamma …) and several IDAT chunks are fine.
    const text = pngChunk("tEXt", ascii("Title\0Poster"));
    expect(dims(u8(PNG_SIG, ihdr(7, 5), text, IDAT, IDAT, IEND))).toEqual(["image/png", 7, 5]);
  });

  it("reads JPEG dimensions from the frame header, walking scans, fill bytes and restarts", () => {
    expect(dims(jpeg(4096, 3906))).toEqual(["image/jpeg", 4096, 3906]);
    expect(dims(jpeg(9, 7, sof(9, 7, 0xc2)))).toEqual(["image/jpeg", 9, 7]); // progressive
    expect(dims(jpeg(9, 7, sof(9, 7, 0xc1, 8, 1)))).toEqual(["image/jpeg", 9, 7]); // grey
    expect(dims(jpeg(9, 7, sof(9, 7, 0xc0, 8, 4)))).toEqual(["image/jpeg", 9, 7]); // CMYK
    // Fill bytes before a marker, and a second scan after a table (as in progressive files).
    const twoScans = u8(
      SOI,
      [0xff, 0xff],
      DQT,
      sof(9, 7, 0xc2),
      DHT,
      SOS,
      SCAN,
      DHT,
      SOS,
      SCAN,
      EOI,
    );
    expect(dims(twoScans)).toEqual(["image/jpeg", 9, 7]);
  });

  it("reads WebP dimensions from simple and extended files, with chunk padding", () => {
    expect(dims(riff([vp8(640, 480)]))).toEqual(["image/webp", 640, 480]);
    expect(dims(riff([vp8l(16384, 1)]))).toEqual(["image/webp", 16384, 1]);
    const exif = webpChunk("EXIF", [1, 2, 3]); // odd size: padded
    expect(dims(riff([vp8x(33, 21, 0x08), vp8(33, 21), exif]))).toEqual(["image/webp", 33, 21]);
    const alpha = webpChunk("ALPH", [0, 1, 2]);
    expect(dims(riff([vp8x(33, 21, 0x10), alpha, vp8(33, 21)]))).toEqual(["image/webp", 33, 21]);
  });

  it("reports dimensions beyond the limits as they are — the policy decides (D6)", () => {
    expect(dims(png(5000, 5000))).toEqual(["image/png", 5000, 5000]);
    expect(dims(png(0x7fffffff, 1))).toEqual(["image/png", 0x7fffffff, 1]);
    expect(dims(jpeg(65535, 65535))).toEqual(["image/jpeg", 65535, 65535]);
    expect(dims(riff([vp8x(1 << 24, 1), vp8l(16384, 1)]))).toBe("malformed"); // canvas ≠ bitstream
  });
});

describe("probeImage — rejected inputs", () => {
  it("rejects formats other than JPEG, PNG and WebP", () => {
    for (const other of [
      u8("GIF89a", [1, 0, 1, 0, 0, 0, 0]),
      u8("BM", Array<number>(30).fill(0)),
      u8("II*\0", [8, 0, 0, 0]), // TIFF
      u8([0, 0, 0, 0x1c], "ftypavif", Array<number>(16).fill(0)), // AVIF
      u8([0, 0, 0, 0x18], "ftypheic", Array<number>(12).fill(0)), // HEIC
      u8('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'),
      u8("<!doctype html><script>"),
      u8("%PDF-1.7"),
      u8("RIFF", le32(4), "WAVE"),
      new Uint8Array(),
      u8([0xff, 0xd8]),
    ])
      expect(dims(other)).toBe("unsupported");
  });

  it("rejects JPEG variants browsers do not decode", () => {
    for (const marker of [0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
      expect(dims(jpeg(9, 7, sof(9, 7, marker))), marker.toString(16)).toBe("unsupported");
    expect(dims(jpeg(9, 7, sof(9, 7, 0xc0, 12)))).toBe("unsupported"); // 12-bit samples
    expect(dims(jpeg(9, 0))).toBe("unsupported"); // height from a later DNL segment
    expect(dims(u8(SOI, seg(0xde, [0, 0]), sof(9, 7), SOS, SCAN, EOI))).toBe("unsupported");
  });

  it("rejects damaged PNG structure", () => {
    const cases: [string, Uint8Array][] = [
      [
        "bad CRC",
        u8(PNG_SIG, pngChunk("IHDR", [...be32(3), ...be32(2), 8, 2, 0, 0, 0], 1), IDAT, IEND),
      ],
      ["IHDR not first", u8(PNG_SIG, pngChunk("tEXt", ascii("a\0b")), ihdr(3, 2), IDAT, IEND)],
      [
        "short IHDR",
        u8(PNG_SIG, pngChunk("IHDR", [...be32(3), ...be32(2), 8, 2, 0, 0]), IDAT, IEND),
      ],
      ["zero width", u8(PNG_SIG, ihdr(0, 2), IDAT, IEND)],
      ["zero height", u8(PNG_SIG, ihdr(3, 0), IDAT, IEND)],
      ["width ≥ 2^31", u8(PNG_SIG, ihdr(0x80000000, 2), IDAT, IEND)],
      ["bad depth for RGB", u8(PNG_SIG, ihdr(3, 2, 4, 2), IDAT, IEND)],
      ["unknown colour type", u8(PNG_SIG, ihdr(3, 2, 8, 5), IDAT, IEND)],
      ["unknown compression", u8(PNG_SIG, ihdr(3, 2, 8, 2, 0, 1), IDAT, IEND)],
      ["unknown interlace", u8(PNG_SIG, ihdr(3, 2, 8, 2, 2), IDAT, IEND)],
      ["palette image without PLTE", u8(PNG_SIG, ihdr(3, 2, 8, 3), IDAT, IEND)],
      ["no image data", u8(PNG_SIG, ihdr(3, 2), IEND)],
      ["second IHDR", u8(PNG_SIG, ihdr(3, 2), ihdr(9, 9), IDAT, IEND)],
      ["IEND with data", u8(PNG_SIG, ihdr(3, 2), IDAT, pngChunk("IEND", [0]))],
      ["chunk type not letters", u8(PNG_SIG, ihdr(3, 2), pngChunk("a<b>", []), IDAT, IEND)],
      ["chunk length ≥ 2^31", u8(PNG_SIG, ihdr(3, 2), [0x80, 0, 0, 0], "tEXt", IDAT, IEND)],
    ];
    for (const [name, bytes] of cases) expect(dims(bytes), name).toBe("malformed");
  });

  it("rejects damaged JPEG structure", () => {
    const cases: [string, Uint8Array][] = [
      ["scan before frame", u8(SOI, DQT, DHT, SOS, SCAN, sof(3, 2), EOI)],
      ["two frames", u8(SOI, sof(3, 2), sof(5, 5), SOS, SCAN, EOI)],
      [
        "frame length ≠ components",
        u8(SOI, seg(0xc0, [8, 0, 2, 0, 3, 3, 1, 0x11, 0]), SOS, SCAN, EOI),
      ],
      ["two components", u8(SOI, sof(3, 2, 0xc0, 8, 2), SOS, SCAN, EOI)],
      ["zero width", u8(SOI, sof(0, 2), SOS, SCAN, EOI)],
      ["second SOI", u8(SOI, SOI, sof(3, 2), SOS, SCAN, EOI)],
      ["restart outside a scan", u8(SOI, [0xff, 0xd0], sof(3, 2), SOS, SCAN, EOI)],
      ["reserved marker", u8(SOI, seg(0x02, [0]), sof(3, 2), SOS, SCAN, EOI)],
      ["segment length < 2", u8(SOI, [0xff, 0xe0, 0, 1], sof(3, 2), SOS, SCAN, EOI)],
      ["end without a scan", u8(SOI, sof(3, 2), EOI)],
      ["garbage between segments", u8(SOI, APP0, [0x00], sof(3, 2), SOS, SCAN, EOI)],
    ];
    for (const [name, bytes] of cases) expect(dims(bytes), name).toBe("malformed");
  });

  it("rejects damaged WebP structure", () => {
    const cases: [string, Uint8Array][] = [
      ["no chunks", riff([])],
      ["unknown first chunk", riff([webpChunk("ICCP", [1, 2])])],
      ["VP8 not a key frame", riff([vp8(3, 2, 0x11)])],
      ["VP8 hidden frame", riff([vp8(3, 2, 0x00)])],
      ["VP8 partition beyond chunk", riff([vp8(3, 2, 0x10 | (100 << 5))])],
      ["VP8 bad start code", riff([vp8(3, 2, 0x10, [0x9d, 0x01, 0x2b])])],
      ["VP8 zero width", riff([vp8(0, 2)])],
      ["VP8 chunk too short", riff([webpChunk("VP8 ", [0x10, 0, 0, 0x9d, 0x01, 0x2a])])],
      ["VP8L bad signature", riff([vp8l(3, 2, 0x2e)])],
      ["VP8L unknown version", riff([vp8l(3, 2, 0x2f, 1)])],
      ["simple file with extra chunk", riff([vp8(3, 2), webpChunk("EXIF", [1, 2])])],
      ["VP8X without image", riff([vp8x(3, 2), webpChunk("EXIF", [1, 2])])],
      ["VP8X with two images", riff([vp8x(3, 2), vp8(3, 2), vp8l(3, 2)])],
      ["VP8X canvas ≠ image", riff([vp8x(300, 200), vp8(3, 2)])],
      ["two VP8X", riff([vp8x(3, 2), vp8x(3, 2), vp8(3, 2)])],
      ["alpha chunk with lossless", riff([vp8x(3, 2, 0x10), webpChunk("ALPH", [0]), vp8l(3, 2)])],
      ["short VP8X", riff([webpChunk("VP8X", [0, 0, 0, 0, 2, 0, 0, 1])])],
    ];
    for (const [name, bytes] of cases) expect(dims(bytes), name).toBe("malformed");
  });

  it("rejects animated images", () => {
    const actl = pngChunk("acTL", [...be32(2), ...be32(0)]);
    expect(dims(u8(PNG_SIG, ihdr(3, 2), actl, IDAT, IEND))).toBe("animated");
    expect(dims(riff([vp8x(3, 2, 0x02), vp8(3, 2)]))).toBe("animated");
    expect(dims(riff([vp8x(3, 2), webpChunk("ANIM", [0, 0, 0, 0, 0, 0]), vp8(3, 2)]))).toBe(
      "animated",
    );
    expect(dims(riff([vp8x(3, 2), webpChunk("ANMF", Array<number>(16).fill(0))]))).toBe("animated");
  });

  it("rejects every truncation of a valid file, including the last byte", () => {
    const valid = [
      REAL.jpeg,
      REAL.jpegProgressive,
      REAL.webpLossy,
      REAL.webpLossless,
      REAL.webpAlpha,
      png(3, 2),
      jpeg(3, 2),
    ];
    for (const file of valid)
      for (let n = 0; n < file.length; n++) expect(probeImage(file.subarray(0, n)).ok).toBe(false);
    expect(dims(png(3, 2).subarray(0, -IEND.length))).toBe("truncated");
    expect(dims(REAL.jpeg.subarray(0, -2))).toBe("truncated");
    expect(dims(REAL.webpLossy.subarray(0, -1))).toBe("truncated");
    // A RIFF header claiming a larger file than was received.
    expect(dims(riff([vp8(3, 2)], 100))).toBe("truncated");
  });

  it("rejects extra data after the image (polyglot files)", () => {
    for (const file of [png(3, 2), REAL.jpeg, REAL.webpLossy])
      expect(dims(u8([...file], "<script>alert(1)</script>"))).toBe("trailing-data");
    expect(dims(riff([vp8(3, 2)], -2))).toBe("trailing-data"); // RIFF smaller than the file
  });

  it("never throws, whatever the bytes", () => {
    let seed = 1042;
    const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const starts = [REAL.jpeg, REAL.webpAlpha, png(3, 2), jpeg(3, 2), riff([vp8l(3, 2)])];
    for (let i = 0; i < 3000; i++) {
      const copy = new Uint8Array(starts[i % starts.length]!);
      for (let k = 0; k < 1 + (i % 5); k++)
        copy[Math.floor(random() * copy.length)] = Math.floor(random() * 256);
      const result = probeImage(copy.subarray(0, Math.floor(random() * (copy.length + 1))));
      expect(typeof result.ok).toBe("boolean");
      if (result.ok) expect(result.width * result.height).toBeGreaterThan(0);
    }
  });
});

describe("D6 image limits", () => {
  it("allows at most 4096 pixels per side and 16,000,000 pixels in total — both always", () => {
    expect(IMAGE_LIMITS).toEqual({ maxSide: 4096, maxPixels: 16_000_000 });
    for (const [w, h] of [
      [1, 1],
      [4096, 1],
      [4096, 3906], // 15,998,976
      [3906, 4096],
      [4000, 4000], // exactly 16,000,000
    ])
      expect(checkImageDimensions(w!, h!), `${w}×${h}`).toBeNull();
    expect(checkImageDimensions(4097, 1)).toMatch(/each side may be at most 4096/);
    expect(checkImageDimensions(1, 4097)).toMatch(/each side may be at most 4096/);
    expect(checkImageDimensions(4096, 4096)).toMatch(/16 megapixels/); // 16,777,216
    expect(checkImageDimensions(4000, 4001)).toMatch(/16 megapixels/); // 16,004,000
    expect(checkImageDimensions(4096, 3907)).toMatch(/16 megapixels/); // 16,003,072
    for (const [w, h] of [
      [0, 10],
      [10, 0],
      [-1, 10],
      [1.5, 10],
      [Number.NaN, 10],
      [Number.POSITIVE_INFINITY, 10],
    ])
      expect(checkImageDimensions(w!, h!), `${w}×${h}`).toMatch(/no valid dimensions/);
  });
});

describe("validateUpload — images are checked by their bytes", () => {
  const check = (bytes: Uint8Array, filename = "poster.png", declaredType = "image/png") =>
    validateUpload({ category: "event-image", filename, declaredType, bytes });

  it("accepts a sound image within the limits and returns its real dimensions", () => {
    expect(check(png(1200, 800))).toEqual({
      ok: true,
      mimeType: "image/png",
      extension: "png",
      bucket: "ashwamedh-images",
      filename: "poster.png",
      width: 1200,
      height: 800,
    });
    expect(check(REAL.jpeg, "poster.jpeg", "image/jpeg")).toMatchObject({
      ok: true,
      extension: "jpg",
      width: 3,
      height: 2,
    });
    expect(check(REAL.webpAlpha, "poster.webp", "image/webp")).toMatchObject({
      ok: true,
      width: 3,
      height: 2,
    });
    expect(check(png(4096, 3906))).toMatchObject({ ok: true, width: 4096, height: 3906 });
  });

  it("rejects a pixel bomb: a tiny file declaring huge dimensions", () => {
    const bomb = png(4096, 4096);
    expect(bomb.length).toBeLessThan(200);
    expect(check(bomb)).toMatchObject({ ok: false, error: expect.stringMatching(/16 megapixels/) });
    expect(check(png(4097, 2))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/each side/),
    });
    expect(check(jpeg(65535, 65535), "big.jpg", "image/jpeg")).toMatchObject({ ok: false });
  });

  it("rejects damaged, truncated, animated and polyglot images with a clear message", () => {
    expect(check(u8(PNG_SIG, "not really a png"))).toMatchObject({ ok: false });
    expect(check(png(3, 2).subarray(0, 40))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/incomplete/),
    });
    const actl = pngChunk("acTL", [...be32(2), ...be32(0)]);
    expect(check(u8(PNG_SIG, ihdr(3, 2), actl, IDAT, IEND))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Animated/),
    });
    expect(check(u8([...png(3, 2)], "<html>"))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/extra data/),
    });
  });

  it("trusts neither the name nor the declared type", () => {
    expect(check(REAL.jpeg, "poster.png", "image/png")).toMatchObject({ ok: false });
    expect(check(png(3, 2), "poster.jpg", "image/jpeg")).toMatchObject({ ok: false });
    expect(check(png(3, 2), "poster.png", "image/webp")).toMatchObject({ ok: false });
  });

  it("keeps the PDF policy unchanged: a PDF is never probed as an image", () => {
    expect(
      validateUpload({
        category: "document",
        filename: "Rules.pdf",
        declaredType: "application/pdf",
        bytes: u8("%PDF-1.7\n%%EOF\n"),
      }),
    ).toEqual({
      ok: true,
      mimeType: "application/pdf",
      extension: "pdf",
      bucket: "ashwamedh-documents",
      filename: "Rules.pdf",
    });
  });
});

describe("checkUploadRequest — before a signed upload URL is issued", () => {
  const request = (over: Partial<Parameters<typeof checkUploadRequest>[0]> = {}) =>
    checkUploadRequest({
      kind: "image",
      filename: "poster.png",
      declaredType: "image/png",
      size: 1000,
      ...over,
    });

  it("maps each media kind to its file category and canonical extension", () => {
    expect(request()).toEqual({
      ok: true,
      category: "event-image",
      mimeType: "image/png",
      extension: "png",
      filename: "poster.png",
    });
    expect(request({ filename: "a.JPEG", declaredType: "image/jpeg" })).toMatchObject({
      ok: true,
      extension: "jpg",
    });
    expect(
      request({ kind: "guidelines", filename: "Rules.pdf", declaredType: "application/pdf" }),
    ).toMatchObject({ ok: true, category: "document", extension: "pdf" });
  });

  it("enforces the size limits per kind, inclusive", () => {
    const image = FILE_RULES["event-image"].maxBytes;
    const pdf = FILE_RULES.document.maxBytes;
    expect(request({ size: image })).toMatchObject({ ok: true });
    expect(request({ size: image + 1 })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/larger than 5 MB/),
    });
    const guidelines = { kind: "guidelines", filename: "r.pdf", declaredType: "application/pdf" };
    expect(request({ ...guidelines, size: pdf })).toMatchObject({ ok: true });
    expect(request({ ...guidelines, size: pdf + 1 })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/10 MB/),
    });
    for (const size of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])
      expect(request({ size }), String(size)).toMatchObject({ ok: false });
  });

  it("rejects unknown kinds, wrong types, mismatched extensions and unsafe names", () => {
    for (const over of [
      { kind: "logo" },
      { kind: "__proto__" },
      { kind: "constructor" },
      { declaredType: "image/svg+xml", filename: "a.svg" },
      { declaredType: "image/gif", filename: "a.gif" },
      { declaredType: "application/pdf", filename: "a.pdf" },
      { declaredType: "image/png", filename: "a.jpg" },
      { declaredType: "image/png", filename: "a.png.html" },
      { filename: "../../poster.png" },
      { filename: ".png" },
      { kind: "guidelines", declaredType: "image/png", filename: "a.png" },
    ])
      expect(request(over), JSON.stringify(over)).toMatchObject({ ok: false });
  });
});

describe("stagingPath — server-generated upload keys", () => {
  const ID = "0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b";
  const TICKET_PATH = /^events\/[a-z0-9-]+\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;

  it("builds events/<slug>/<uuid>.<ext>, the shape upload tickets accept", () => {
    expect(stagingPath("image", "rocketry", ID, "webp")).toBe(`events/rocketry/${ID}.webp`);
    expect(stagingPath("guidelines", "hackathon", ID, "pdf")).toBe(`events/hackathon/${ID}.pdf`);
    expect(stagingPath("image", "rocketry", ID, "jpg")).toMatch(TICKET_PATH);
  });

  it("refuses unknown events, bad ids and extensions of another kind", () => {
    expect(() => stagingPath("image", "rocketry", ID, "pdf")).toThrow(/extension/);
    expect(() => stagingPath("guidelines", "rocketry", ID, "png")).toThrow(/extension/);
    expect(() => stagingPath("image", "rocketry", ID, "jpeg")).toThrow(/extension/);
    expect(() => stagingPath("image", "../rocketry", ID, "png")).toThrow(/Unknown event/);
    expect(() => stagingPath("image", "not-an-event", ID, "png")).toThrow(/Unknown event/);
    expect(() => stagingPath("image", "rocketry", `${ID}/../x`, "png")).toThrow(/file id/);
    expect(() =>
      stagingPath("logo" as Parameters<typeof stagingPath>[0], "rocketry", ID, "png"),
    ).toThrow(/media kind/);
  });
});
