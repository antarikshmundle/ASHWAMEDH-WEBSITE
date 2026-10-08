import { eventInventory } from "@/data/events";
import { BUCKETS, type Bucket, type FileCategory } from "./schema";

/**
 * What may be uploaded to the CMS (Phase 10.2). Pure and testable; the server-only file service
 * (files.ts) applies it before anything reaches Storage. Supabase Storage enforces the same MIME
 * and size limits per bucket (supabase/migrations/…_cms_storage.sql).
 *
 * The file's real type is taken from its first bytes, not from its name or the browser's claim;
 * the claimed type and the extension must agree with it. Anything else (SVG, HTML, scripts,
 * executables, archives, Office files …) is rejected.
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
  | { ok: true; mimeType: Mime; extension: string; bucket: Bucket; filename: string }
  | { ok: false; error: string };

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
  const extension = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  if (!EXTENSIONS[actual].accepted.includes(extension)) {
    return { ok: false, error: "The file extension does not match its contents." };
  }
  return {
    ok: true,
    mimeType: actual,
    extension: EXTENSIONS[actual].canonical,
    bucket: rules.bucket,
    filename,
  };
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
