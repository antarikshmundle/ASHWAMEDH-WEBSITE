import { eventInventory } from "@/data/events";
import { probeImage } from "./image-dimensions";
import { BUCKETS, type Bucket, type FileCategory } from "./schema";

/**
 * What may be uploaded to the CMS (Phase 10.2). Pure and testable; the server-only media service
 * (media-admin.ts) applies it to the stored bytes before anything is published. Supabase Storage enforces the same MIME
 * and size limits per bucket (supabase/migrations/…_cms_storage.sql).
 *
 * The file's real type is taken from its first bytes, not from its name or the browser's claim;
 * the claimed type and the extension must agree with it. Anything else (SVG, HTML, scripts,
 * executables, archives, Office files …) is rejected. Images must also have a sound structure and
 * fit the pixel limits (D6, Phase 10.4): their dimensions are read from the bytes (image-dimensions.ts).
 */

type Mime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

const EXTENSIONS: Record<Mime, { canonical: string; accepted: readonly string[] }> = {
  "application/pdf": { canonical: "pdf", accepted: ["pdf"] },
  "image/jpeg": { canonical: "jpg", accepted: ["jpg", "jpeg"] },
  "image/png": { canonical: "png", accepted: ["png"] },
  "image/webp": { canonical: "webp", accepted: ["webp"] },
};

const MB = 1024 * 1024;
const IMAGE = {
  bucket: BUCKETS.images,
  maxBytes: 5 * MB,
  types: ["image/jpeg", "image/png", "image/webp"],
};

export const FILE_RULES: Record<
  FileCategory,
  { bucket: Bucket; maxBytes: number; types: readonly Mime[]; folder: string; perEvent: boolean }
> = {
  document: {
    bucket: BUCKETS.documents,
    maxBytes: 10 * MB,
    types: ["application/pdf"],
    folder: "events",
    perEvent: true,
  },
  "event-image": { ...IMAGE, types: IMAGE.types as Mime[], folder: "events", perEvent: true },
  "gallery-image": { ...IMAGE, types: IMAGE.types as Mime[], folder: "gallery", perEvent: false },
  "team-image": { ...IMAGE, types: IMAGE.types as Mime[], folder: "team", perEvent: false },
  logo: { ...IMAGE, types: IMAGE.types as Mime[], folder: "logos", perEvent: false },
};

/** D6: at most 4096 pixels per side AND at most 16,000,000 pixels in total (both always apply). */
export const IMAGE_LIMITS = { maxSide: 4096, maxPixels: 16_000_000 } as const;

/** `null` when the dimensions are allowed, otherwise the reason. */
export function checkImageDimensions(width: number, height: number): string | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    return "The image has no valid dimensions.";
  }
  if (width > IMAGE_LIMITS.maxSide || height > IMAGE_LIMITS.maxSide) {
    return `The image is ${width} × ${height} pixels; each side may be at most ${IMAGE_LIMITS.maxSide} pixels.`;
  }
  if (width * height > IMAGE_LIMITS.maxPixels) {
    return `The image is ${width} × ${height} pixels; at most 16 megapixels (16,000,000 pixels) are allowed.`;
  }
  return null;
}

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** The file type from its leading bytes, or `null` for anything not allowed. */
export function sniffType(bytes: Uint8Array): Mime | null {
  if (startsWith(bytes, ascii("%PDF-"))) return "application/pdf";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
  return null;
}

/**
 * The uploaded name as display metadata, or `null` when unusable. It is never used to build a
 * storage path; path separators, control characters and leading dots are rejected outright.
 */
export function sanitizeFilename(name: string): string | null {
  const value = name.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!value || value.length > 200) return null;
  if (/[/\\]|[\u0000-\u001f\u007f]/.test(value) || value.startsWith(".") || value.includes("..")) {
    return null;
  }
  return value;
}

export type UploadCheck =
  | {
      ok: true;
      mimeType: Mime;
      extension: string;
      bucket: Bucket;
      filename: string;
      /** Images only: read from the file's own headers. */
      width?: number;
      height?: number;
    }
  | { ok: false; error: string };

const extensionOf = (filename: string) =>
  filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";

export function validateUpload(input: {
  category: FileCategory;
  filename: string;
  declaredType: string;
  bytes: Uint8Array;
}): UploadCheck {
  const rules = FILE_RULES[input.category];
  if (!rules) return { ok: false, error: "Unknown file category." };

  const filename = sanitizeFilename(input.filename);
  if (!filename) return { ok: false, error: "The file name is not allowed." };

  const size = input.bytes.byteLength;
  if (size === 0) return { ok: false, error: "The file is empty." };
  if (size > rules.maxBytes) {
    return { ok: false, error: `The file is larger than ${rules.maxBytes / MB} MB.` };
  }

  const actual = sniffType(input.bytes);
  if (!actual || !rules.types.includes(actual)) {
    return { ok: false, error: "This type of file is not allowed here." };
  }
  if (input.declaredType !== actual) {
    return { ok: false, error: "The file's contents do not match its type." };
  }
  if (!EXTENSIONS[actual].accepted.includes(extensionOf(filename))) {
    return { ok: false, error: "The file extension does not match its contents." };
  }
  const result = {
    ok: true as const,
    mimeType: actual,
    extension: EXTENSIONS[actual].canonical,
    bucket: rules.bucket,
    filename,
  };
  if (actual === "application/pdf") return result;

  const image = probeImage(input.bytes);
  if (!image.ok) return { ok: false, error: image.error };
  if (image.type !== actual)
    return { ok: false, error: "The file's contents do not match its type." };
  const tooLarge = checkImageDimensions(image.width, image.height);
  if (tooLarge) return { ok: false, error: tooLarge };
  return { ...result, width: image.width, height: image.height };
}

/* ---------- Event media uploads (Phase 10.4): request pre-check and staging paths ---------- */

/** The two media slots of an event and the file category each one stores. */
export const MEDIA_KINDS = { image: "event-image", guidelines: "document" } as const;
export type MediaKind = keyof typeof MEDIA_KINDS;
export const isMediaKind = (value: unknown): value is MediaKind =>
  typeof value === "string" && Object.hasOwn(MEDIA_KINDS, value);

export type UploadRequestCheck =
  | { ok: true; category: FileCategory; mimeType: Mime; extension: string; filename: string }
  | { ok: false; error: string };

/**
 * Checks what the browser says it will upload, before a signed upload URL is issued. This only
 * spares the admin a pointless upload: none of it is trusted. The stored bytes are validated
 * again with validateUpload() when the upload is finalized.
 */
export function checkUploadRequest(input: {
  kind: string;
  filename: string;
  declaredType: string;
  size: number;
}): UploadRequestCheck {
  if (!isMediaKind(input.kind)) return { ok: false, error: "Unknown media kind." };
  const category = MEDIA_KINDS[input.kind];
  const rules = FILE_RULES[category];

  const filename = sanitizeFilename(input.filename);
  if (!filename) return { ok: false, error: "The file name is not allowed." };
  if (!Number.isSafeInteger(input.size) || input.size < 1) {
    return { ok: false, error: "The file is empty." };
  }
  if (input.size > rules.maxBytes) {
    return { ok: false, error: `The file is larger than ${rules.maxBytes / MB} MB.` };
  }
  const mimeType = rules.types.find((type) => type === input.declaredType);
  if (!mimeType) return { ok: false, error: "This type of file is not allowed here." };
  if (!EXTENSIONS[mimeType].accepted.includes(extensionOf(filename))) {
    return { ok: false, error: "The file extension does not match its type." };
  }
  return { ok: true, category, mimeType, extension: EXTENSIONS[mimeType].canonical, filename };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Server-generated storage key: `<folder>[/<event-slug>]/<uuid>.<ext>`. Event files must name a
 * frozen inventory slug; nothing from the uploaded file name ever reaches the path.
 */
export function storagePath(
  category: FileCategory,
  id: string,
  extension: string,
  eventSlug?: string,
): string {
  const rules = FILE_RULES[category];
  if (!UUID.test(id)) throw new Error("Invalid file id.");
  if (!["pdf", "jpg", "png", "webp"].includes(extension)) throw new Error("Invalid extension.");
  if (rules.perEvent) {
    if (!eventSlug || !eventInventory.some((e) => e.slug === eventSlug)) {
      throw new Error(`Unknown event slug "${eventSlug ?? ""}".`);
    }
    return `${rules.folder}/${eventSlug}/${id}.${extension}`;
  }
  if (eventSlug) throw new Error(`${category} files are not attached to an event.`);
  return `${rules.folder}/${id}.${extension}`;
}

/**
 * Server-generated key of an upload in the private staging bucket: `events/<slug>/<uuid>.<ext>`,
 * the shape cms_upload_tickets.object_path enforces. The extension must belong to the media kind.
 */
export function stagingPath(kind: MediaKind, eventSlug: string, id: string, extension: string) {
  if (!isMediaKind(kind)) throw new Error("Unknown media kind.");
  const category = MEDIA_KINDS[kind];
  const allowed = FILE_RULES[category].types.map((type) => EXTENSIONS[type].canonical);
  if (!allowed.includes(extension)) throw new Error("Invalid extension.");
  return storagePath(category, id, extension, eventSlug);
}
