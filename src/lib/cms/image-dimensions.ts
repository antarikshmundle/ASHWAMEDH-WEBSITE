/**
 * Image header checks for CMS uploads (Phase 10.4). Pure and testable: reads only the bytes it is
 * given, never decodes pixels, never trusts the file name, the browser's MIME type or any size the
 * client reports. The size limits themselves (D6) live in upload-policy.ts.
 *
 * Accepted: still JPEG (baseline or progressive, 8-bit), PNG and WebP (lossy, lossless or extended
 * without animation). The whole container is walked so that a damaged, truncated or animated file,
 * or one carrying extra data after the image (a polyglot), is rejected — not only the first header.
 */

export type ImageType = "image/jpeg" | "image/png" | "image/webp";
export type ImageProblem = "unsupported" | "malformed" | "truncated" | "animated" | "trailing-data";

export type ImageProbe =
  | { ok: true; type: ImageType; width: number; height: number }
  | { ok: false; reason: ImageProblem; error: string };

const MESSAGES: Record<ImageProblem, string> = {
  unsupported: "This kind of image is not supported. Use a standard JPEG, PNG or WebP file.",
  malformed: "The image file is damaged or not a valid image.",
  truncated: "The image file is incomplete. Please upload it again.",
  animated: "Animated images are not allowed.",
  "trailing-data": "The image file has extra data after the image. Please export it again.",
};

const fail = (reason: ImageProblem): ImageProbe => ({ ok: false, reason, error: MESSAGES[reason] });
const found = (type: ImageType, width: number, height: number): ImageProbe =>
  width > 0 && height > 0 ? { ok: true, type, width, height } : fail("malformed");

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u32be = (b: Uint8Array, i: number) =>
  ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
const u16le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32le = (b: Uint8Array, i: number) => (u24le(b, i) | (b[i + 3]! << 24)) >>> 0;
const text = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

/** Width and height from the file's own headers, after checking its whole structure. */
export function probeImage(bytes: Uint8Array): ImageProbe {
  if (bytes.length >= 8 && u32be(bytes, 0) === 0x89504e47 && u32be(bytes, 4) === 0x0d0a1a0a)
    return probePng(bytes);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return probeJpeg(bytes);
  if (bytes.length >= 12 && text(bytes, 0, 4) === "RIFF" && text(bytes, 8, 4) === "WEBP")
    return probeWebp(bytes);
  return fail("unsupported");
}

/* ---------- PNG: every chunk length and CRC, IHDR first, IDAT present, IEND last ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Allowed bit depths for each PNG colour type (PNG spec, table 11.1). */
const PNG_DEPTHS: Record<number, readonly number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

function probePng(b: Uint8Array): ImageProbe {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colourType = -1;
  let palette = false;
  let idat = false;
  while (true) {
    if (pos + 8 > b.length) return fail("truncated");
    const length = u32be(b, pos);
    const type = text(b, pos + 4, 4);
    if (length > 0x7fffffff || !/^[A-Za-z]{4}$/.test(type)) return fail("malformed");
    const end = pos + 12 + length;
    if (end > b.length) return fail("truncated");
    if (crc32(b.subarray(pos + 4, pos + 8 + length)) !== u32be(b, pos + 8 + length))
      return fail("malformed");
    const data = pos + 8;

    if (pos === 8) {
      if (type !== "IHDR" || length !== 13) return fail("malformed");
      width = u32be(b, data);
      height = u32be(b, data + 4);
      const depth = b[data + 8]!;
      colourType = b[data + 9]!;
      if (width === 0 || height === 0 || width > 0x7fffffff || height > 0x7fffffff)
        return fail("malformed");
      if (!PNG_DEPTHS[colourType]?.includes(depth)) return fail("malformed");
      // Compression and filter method 0; interlace none (0) or Adam7 (1).
      if (b[data + 10] !== 0 || b[data + 11] !== 0 || b[data + 12]! > 1) return fail("malformed");
    } else if (type === "IHDR") {
      return fail("malformed");
    } else if (type === "acTL" || type === "fcTL" || type === "fdAT") {
      return fail("animated");
    } else if (type === "PLTE") {
      palette = true;
    } else if (type === "IDAT") {
      if (colourType === 3 && !palette) return fail("malformed");
      idat = true;
    } else if (type === "IEND") {
      if (length !== 0 || !idat) return fail("malformed");
      return end === b.length ? found("image/png", width, height) : fail("trailing-data");
    }
    pos = end;
  }
}

/* ---------- JPEG: marker segments up to EOI, one supported frame header, scans walked ---------- */

// Baseline (C0), extended sequential (C1) and progressive (C2) Huffman frames: what browsers
// decode. Lossless, hierarchical and arithmetic-coded frames are refused.
const JPEG_FRAMES = new Set([0xc0, 0xc1, 0xc2]);
const JPEG_OTHER_FRAMES = new Set([0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
// Table / restart / application / comment segments that may appear between frame and scans.
const isJpegTable = (m: number) =>
  m === 0xc4 || m === 0xcc || m === 0xdb || m === 0xdd || (m >= 0xe0 && m <= 0xef) || m === 0xfe;

function probeJpeg(b: Uint8Array): ImageProbe {
  let pos = 2;
  let width = 0;
  let height = 0;
  let frame = false;
  let scanned = false;
  while (true) {
    if (pos >= b.length) return fail("truncated");
    if (b[pos] !== 0xff) return fail("malformed");
    while (pos < b.length && b[pos] === 0xff) pos++; // fill bytes before a marker
    if (pos >= b.length) return fail("truncated");
    const marker = b[pos++]!;

    if (marker === 0xd9) {
      if (!scanned) return fail("malformed");
      return pos === b.length ? found("image/jpeg", width, height) : fail("trailing-data");
    }
    if (JPEG_OTHER_FRAMES.has(marker) || marker === 0xdc || marker === 0xde || marker === 0xdf)
      return fail("unsupported");
    if (!JPEG_FRAMES.has(marker) && marker !== 0xda && !isJpegTable(marker))
      return fail("malformed"); // SOI again, stray RSTn/TEM, reserved markers

    if (pos + 2 > b.length) return fail("truncated");
    const length = u16be(b, pos);
    if (length < 2) return fail("malformed");
    const end = pos + length;
    if (end > b.length) return fail("truncated");

    if (JPEG_FRAMES.has(marker)) {
      if (frame || scanned || length < 8) return fail("malformed");
      const components = b[pos + 7]!;
      if (length !== 8 + 3 * components || ![1, 3, 4].includes(components))
        return fail("malformed");
      if (b[pos + 2] !== 8) return fail("unsupported"); // 12-bit samples
      height = u16be(b, pos + 3);
      width = u16be(b, pos + 5);
      if (height === 0) return fail("unsupported"); // height defined later by DNL
      frame = true;
      pos = end;
    } else if (marker === 0xda) {
      if (!frame) return fail("malformed");
      scanned = true;
      // Entropy-coded data: 0xFF is followed by 0x00 (stuffing), RSTn or the next marker.
      pos = end;
      while (true) {
        while (pos < b.length && b[pos] !== 0xff) pos++;
        if (pos + 1 >= b.length) return fail("truncated");
        const next = b[pos + 1]!;
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) pos += 2;
        else if (next === 0xff) pos += 1;
        else break;
      }
    } else {
      pos = end;
    }
  }
}

/* ---------- WebP: RIFF size exact, chunks walked, still image only ---------- */

interface Chunk {
  type: string;
  start: number;
  size: number;
}

function vp8Size(b: Uint8Array, chunk: Chunk): [number, number] | null {
  const d = chunk.start;
  if (chunk.size < 10) return null;
  const tag = u24le(b, d);
  // Key frame (bit 0 clear), shown, first partition inside the chunk, then the start code.
  if (tag & 1 || !((tag >>> 4) & 1) || tag >>> 5 > chunk.size - 10) return null;
  if (b[d + 3] !== 0x9d || b[d + 4] !== 0x01 || b[d + 5] !== 0x2a) return null;
  return [u16le(b, d + 6) & 0x3fff, u16le(b, d + 8) & 0x3fff];
}

function vp8lSize(b: Uint8Array, chunk: Chunk): [number, number] | null {
  const d = chunk.start;
  if (chunk.size < 5 || b[d] !== 0x2f) return null;
  const bits = u32le(b, d + 1);
  if (bits >>> 29 !== 0) return null; // version must be 0
  return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
}

function probeWebp(b: Uint8Array): ImageProbe {
  const riffEnd = 8 + u32le(b, 4);
  if (riffEnd > b.length) return fail("truncated");
  if (riffEnd < b.length) return fail("trailing-data");

  const chunks: Chunk[] = [];
  for (let pos = 12; pos < riffEnd;) {
    if (pos + 8 > riffEnd) return fail("truncated");
    const size = u32le(b, pos + 4);
    const next = pos + 8 + size + (size & 1);
    if (pos + 8 + size > riffEnd) return fail("truncated");
    if (next > riffEnd) return fail("malformed");
    chunks.push({ type: text(b, pos, 4), start: pos + 8, size });
    pos = next;
  }
  const first = chunks[0];
  if (!first) return fail("malformed");

  if (first.type === "VP8 " || first.type === "VP8L") {
    if (chunks.length !== 1) return fail("malformed"); // simple format: the image chunk only
    const size = first.type === "VP8 " ? vp8Size(b, first) : vp8lSize(b, first);
    return size ? found("image/webp", size[0], size[1]) : fail("malformed");
  }
  if (first.type !== "VP8X") return fail("malformed");
  if (first.size < 10) return fail("malformed");
  const flags = b[first.start]!;
  if (flags & 0x02 || chunks.some((c) => c.type === "ANIM" || c.type === "ANMF"))
    return fail("animated");
  const width = u24le(b, first.start + 4) + 1;
  const height = u24le(b, first.start + 7) + 1;

  const images = chunks.filter((c) => c.type === "VP8 " || c.type === "VP8L");
  if (images.length !== 1 || chunks.slice(1).some((c) => c.type === "VP8X"))
    return fail("malformed");
  const image = images[0]!;
  if (image.type === "VP8L" && chunks.some((c) => c.type === "ALPH")) return fail("malformed");
  const size = image.type === "VP8 " ? vp8Size(b, image) : vp8lSize(b, image);
  if (!size || size[0] !== width || size[1] !== height) return fail("malformed");
  return found("image/webp", width, height);
}
