import "server-only";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin/auth";
import { CMS_TABLES, type FileCategory, type FileRow } from "./schema";
import { cmsAdminClient } from "./server";
import { storagePath, validateUpload } from "./upload-policy";

/**
 * CMS file service (Phase 10.2): the only code that writes to Storage. Not exposed as a route —
 * the admin file manager (Phase 10.4) will call it from authenticated Server Actions.
 * Every call checks the admin session first; the service-role key stays on the server.
 */

export interface UploadInput {
  category: FileCategory;
  file: File;
  eventSlug?: string;
  altText?: string | null;
}

export type UploadResult = { ok: true; file: FileRow } | { ok: false; error: string };

export async function uploadCmsFile(input: UploadInput): Promise<UploadResult> {
  await requireAdmin();

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const check = validateUpload({
    category: input.category,
    filename: input.file.name,
    declaredType: input.file.type,
    bytes,
  });
  if (!check.ok) return check;

  const altText = input.altText?.trim() || null;
  if (input.category !== "document" && altText && altText.length > 300) {
    return { ok: false, error: "Alt text is too long (300 characters at most)." };
  }

  const id = randomUUID();
  const path = storagePath(input.category, id, check.extension, input.eventSlug);
  const { client } = cmsAdminClient();

  const stored = await client.storage.from(check.bucket).upload(path, bytes, {
    contentType: check.mimeType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (stored.error) return { ok: false, error: `Upload failed: ${stored.error.message}` };

  const row: FileRow = {
    id,
    bucket: check.bucket,
    path,
    original_name: check.filename,
    mime_type: check.mimeType,
    size_bytes: bytes.byteLength,
    category: input.category,
    alt_text: input.category === "document" ? null : altText,
  };
  const saved = await client.from(CMS_TABLES.files).insert(row);
  if (saved.error) {
    await client.storage.from(check.bucket).remove([path]);
    return { ok: false, error: `Saving file details failed: ${saved.error.message}` };
  }
  return { ok: true, file: row };
}

/** Deletes a file's metadata and its stored object. Linked content falls back to TBA. */
export async function deleteCmsFile(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const { client } = cmsAdminClient();

  const found = await client
    .from(CMS_TABLES.files)
    .select("bucket,path")
    .eq("id", id)
    .maybeSingle();
  if (found.error) return { ok: false, error: found.error.message };
  if (!found.data) return { ok: false, error: "File not found." };

  const removed = await client.from(CMS_TABLES.files).delete().eq("id", id);
  if (removed.error) return { ok: false, error: removed.error.message };
  const { bucket, path } = found.data as Pick<FileRow, "bucket" | "path">;
  const object = await client.storage.from(bucket).remove([path]);
  return object.error ? { ok: false, error: object.error.message } : { ok: true };
}
