import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/auth";
import { inventoryEvent } from "./admin-events";
import { validateGalleryItem, type GalleryValues } from "./collection-form";
import { verifyImageDecodes } from "./image-decode";
import { expireCollection, expireEventContent } from "./revalidate";
import { CMS_TABLES, STAGING_BUCKET, type UploadTicketRow } from "./schema";
import { cmsAdminClient } from "./server";
import {
  FILE_RULES,
  TICKET_CATEGORIES,
  checkFileRequest,
  checkUploadRequest,
  isMediaKind,
  stagingPath,
  storagePath,
  validateUpload,
  type MediaKind,
  type TicketKind,
  type UploadRequestCheck,
} from "./upload-policy";

/**
 * Event media service (Phase 10.4.3): signed direct uploads (D1), finalization, removal, image alt
 * text and restore with media links (D5). Server-only; every function checks the admin session.
 *
 * Upload: requestMediaUpload() issues a ticket (15 minutes) bound to the event, the kind and a
 * server-generated path, and a signed URL for that path in the PRIVATE staging bucket. The browser
 * uploads there. finalizeMediaUpload() then claims the ticket, reads the stored bytes, validates
 * them (type, size, structure, D6 limits, full decode), writes those exact bytes to the public
 * bucket under the same path, and links the file in one database transaction (cms_finalize_upload).
 *
 * Storage and the database are separate systems; nothing here is atomic across them. Instead:
 *   - nothing public is ever referenced before the database transaction commits;
 *   - a definite database failure (it rolled back) removes the public copy again;
 *   - an unclear outcome (network error) deletes nothing: the ticket stays "processing" and a
 *     retry either sees it finalized (idempotent) or may claim it again after 10 minutes;
 *   - staging objects and unreferenced public objects that remain are left to the cleanup
 *     (Phase 10.4.6), which checks references, active tickets and the 24-hour grace first.
 * Replacing or removing media never deletes the previous file; it is detached (cleanup later).
 */

export const SET_MEDIA_RPC = "cms_set_event_media";
export const FINALIZE_RPC = "cms_finalize_upload";
export const RESTORE_RPC = "cms_restore_event";
/** A claim older than this was interrupted and may be taken over (matches the migration). */
export const PROCESSING_STALE_MS = 10 * 60 * 1000;
export const ALT_TEXT_MAX = 300;
/**
 * Cache-Control max-age (seconds) for public media objects: one day. Paths are fresh uuids, so a
 * replacement is a new URL anyway; the shorter lifetime bounds how long CDN / optimizer copies of a
 * removed file keep their normal freshness. It does not purge copies that are already cached.
 */
export const PUBLIC_CACHE_MAX_AGE = "86400";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type MediaFailure =
  "invalid" | "missing" | "conflict" | "needs-source" | "expired" | "busy" | "rejected" | "failed";
export type MediaResult<T = object> =
  ({ ok: true } & T) | { ok: false; reason: MediaFailure; error: string };

const MESSAGES: Record<MediaFailure, string> = {
  invalid: "This request is not valid.",
  missing: "This event is not available.",
  conflict: "This event was changed elsewhere. Reload the page and try again.",
  "needs-source": "Save the event's content source first, then add files.",
  expired: "The upload took too long. Please upload the file again.",
  busy: "This upload is still being processed. Please wait a moment and reload.",
  rejected: "This file was not accepted. Please upload it again.",
  failed: "Something went wrong. Please try again.",
};
const failure = (reason: MediaFailure, error = MESSAGES[reason]) =>
  ({ ok: false, reason, error }) as const;

interface PgError {
  code?: string;
  message: string;
}

/** Maps a database error (raised by the RPCs or a constraint) to a failure. */
function databaseFailure(error: PgError) {
  const message = error.message;
  if (message.includes("cms_version_conflict")) return failure("conflict");
  if (message.includes("cms_unknown_event")) return failure("missing");
  if (message.includes("events_content_content_needs_source")) return failure("needs-source");
  if (
    /cms_(invalid_ticket|ticket_not_claimed|invalid_kind|file_not_for_event|unknown_revision)/.test(
      message,
    )
  )
    return failure("invalid");
  return failure("failed");
}

/**
 * PostgREST reports database errors with an SQLSTATE code; a failed request (network, timeout)
 * has none, and then the transaction may or may not have committed.
 */
const isDefinite = (error: PgError) => Boolean(error.code);

/** Alt text for an event image: trimmed, single-spaced, ≤ 300 characters; blank = none. */
export function normalizeAltText(
  value: unknown,
): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value.replace(/[\t\n\r]/g, " ")))
    return { ok: false };
  const text = value.normalize("NFC").replace(/\s+/g, " ").trim();
  if (text.length > ALT_TEXT_MAX) return { ok: false };
  return { ok: true, value: text || null };
}

async function removeQuietly(client: SupabaseClient, bucket: string, path: string) {
  try {
    const { error } = await client.storage.from(bucket).remove([path]);
    if (error) console.warn(`[cms] leaving ${bucket}/${path} for cleanup: ${error.message}`);
  } catch (error) {
    console.warn(`[cms] leaving ${bucket}/${path} for cleanup: ${(error as Error).message}`);
  }
}

/* ---------- 1. issue an upload ticket and signed URL ---------- */

export interface UploadTicket {
  ticketId: string;
  /** Signed upload URL for the private staging bucket. Secret: give it only to this admin. */
  uploadUrl: string;
  expiresAt: string;
  contentType: string;
  maxBytes: number;
}

export async function requestMediaUpload(input: {
  slug: string;
  kind: string;
  filename: string;
  type: string;
  size: number;
  version: string;
}): Promise<MediaResult<UploadTicket>> {
  await requireAdmin();
  if (!inventoryEvent(input.slug)) return failure("missing");
  const request = checkUploadRequest({
    kind: input.kind,
    filename: input.filename,
    declaredType: input.type,
    size: input.size,
  });
  if (!request.ok) return failure("invalid", request.error);
  if (typeof input.version !== "string" || !input.version) return failure("conflict");
  const kind = input.kind as MediaKind;
  const { client } = cmsAdminClient();

  // D3 and the version the editor holds (the database compares the timestamps exactly). Both are
  // checked again when the upload is finalized; this only spares a pointless upload.
  const event = await client
    .from(CMS_TABLES.events)
    .select("source_kind")
    .eq("event_slug", input.slug)
    .eq("updated_at", input.version)
    .maybeSingle();
  if (event.error && !event.error.code?.startsWith("22")) {
    console.error(`[cms] loading "${input.slug}" for upload failed: ${event.error.message}`);
    return failure("failed");
  }
  if (!event.data) {
    const exists = await client
      .from(CMS_TABLES.events)
      .select("event_slug")
      .eq("event_slug", input.slug)
      .maybeSingle();
    if (exists.error) return failure("failed");
    return failure(exists.data ? "conflict" : "missing");
  }
  if (!(event.data as { source_kind: string | null }).source_kind) return failure("needs-source");

  return issueTicket(
    client,
    { event_slug: input.slug, kind },
    stagingPath(kind, input.slug, randomUUID(), request.extension),
    request,
    input.size,
  );
}

/** Inserts the ticket and signs its staging path; closes the ticket again if signing fails. */
async function issueTicket(
  client: SupabaseClient,
  owner: { event_slug: string | null; kind: TicketKind },
  objectPath: string,
  request: Extract<UploadRequestCheck, { ok: true }>,
  size: number,
): Promise<MediaResult<UploadTicket>> {
  const ticket = await client
    .from(CMS_TABLES.tickets)
    .insert({
      event_slug: owner.event_slug,
      kind: owner.kind,
      object_path: objectPath,
      original_name: request.filename,
      declared_type: request.mimeType,
      declared_size: size,
    })
    .select("id, expires_at")
    .single();
  if (ticket.error) {
    console.error(`[cms] creating an upload ticket failed: ${ticket.error.message}`);
    return failure("failed");
  }
  const { id, expires_at } = ticket.data as Pick<UploadTicketRow, "id" | "expires_at">;

  const signed = await client.storage.from(STAGING_BUCKET).createSignedUploadUrl(objectPath);
  if (signed.error || !signed.data) {
    console.error(`[cms] signing an upload failed: ${signed.error?.message ?? "no data"}`);
    await client
      .from(CMS_TABLES.tickets)
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        failure: "Signing failed.",
      })
      .eq("id", id)
      .eq("status", "issued");
    return failure("failed");
  }
  return {
    ok: true,
    ticketId: id,
    uploadUrl: signed.data.signedUrl,
    expiresAt: expires_at,
    contentType: request.mimeType,
    maxBytes: FILE_RULES[request.category].maxBytes,
  };
}

/* ---------- 2. finalize: validate, promote, link ---------- */

export interface FinalizedMedia {
  fileId: string;
  version: string;
  /** True when this ticket had already been finalized (a repeated call). */
  repeated: boolean;
}

/** issued (not expired) → processing, or a stale processing claim taken over. One winner. */
async function claimTicket(
  client: SupabaseClient,
  id: string,
  slug: string | null,
  kind: TicketKind,
) {
  const now = new Date();
  const stale = new Date(now.getTime() - PROCESSING_STALE_MS);
  const base = client
    .from(CMS_TABLES.tickets)
    .update({ status: "processing", processing_at: now.toISOString() })
    .eq("id", id);
  // Gallery tickets have no event (Phase 10.6).
  return (slug === null ? base.is("event_slug", null) : base.eq("event_slug", slug))
    .eq("kind", kind)
    .or(
      `and(status.eq.issued,expires_at.gt."${now.toISOString()}"),` +
        `and(status.eq.processing,processing_at.lt."${stale.toISOString()}")`,
    )
    .select("*")
    .maybeSingle();
}

/** Ends our claim as failed (only while it is still ours). */
async function failTicket(client: SupabaseClient, ticket: UploadTicketRow, reason: string) {
  await client
    .from(CMS_TABLES.tickets)
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      failure: reason.slice(0, 300),
    })
    .eq("id", ticket.id)
    .eq("status", "processing")
    .eq("processing_at", ticket.processing_at!);
}

/** Gives our claim back after a temporary problem, so the admin can retry at once. */
async function releaseTicket(client: SupabaseClient, ticket: UploadTicketRow) {
  await client
    .from(CMS_TABLES.tickets)
    .update({ status: "issued", processing_at: null })
    .eq("id", ticket.id)
    .eq("status", "processing")
    .eq("processing_at", ticket.processing_at!);
}

async function finalizeRpc(
  client: SupabaseClient,
  ticketId: string,
  slug: string,
  kind: MediaKind,
  version: string,
  file: Record<string, unknown>,
) {
  return client.rpc(FINALIZE_RPC, {
    p_ticket_id: ticketId,
    p_slug: slug,
    p_kind: kind,
    p_expected_updated_at: version,
    p_file: file,
  });
}

type FinalizeRow = { file_id: string; updated_at: string; repeated: boolean };
const finalized = (row: FinalizeRow): MediaResult<FinalizedMedia> => ({
  ok: true,
  fileId: row.file_id,
  version: String(row.updated_at),
  repeated: row.repeated,
});

/** The ticket could not be claimed: explain why, or return the earlier result (idempotent). */
async function unclaimed<T>(
  client: SupabaseClient,
  ticketId: string,
  slug: string | null,
  kind: TicketKind,
  repeat: () => PromiseLike<RpcReply>,
  done: (data: unknown) => MediaResult<T>,
): Promise<MediaResult<T>> {
  const { data, error } = await client
    .from(CMS_TABLES.tickets)
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();
  if (error) return failure("failed");
  const ticket = data as UploadTicketRow | null;
  if (!ticket || ticket.event_slug !== slug || ticket.kind !== kind) return failure("invalid");
  if (ticket.status === "finalized") {
    const again = await repeat();
    return again.error ? databaseFailure(again.error) : done(again.data);
  }
  if (ticket.status === "failed") return failure("rejected");
  if (ticket.status === "processing") return failure("busy");
  // Issued but expired: close it; its staging object (if any) is no longer needed.
  const closed = await client
    .from(CMS_TABLES.tickets)
    .update({ status: "failed", finished_at: new Date().toISOString(), failure: "Expired." })
    .eq("id", ticketId)
    .eq("status", "issued")
    .select("id");
  if (!closed.error && closed.data?.length)
    await removeQuietly(client, STAGING_BUCKET, ticket.object_path);
  return failure("expired");
}

type BytesCheck =
  | { ok: true; mimeType: string; width: number | null; height: number | null }
  | { ok: false; error: string };

/** Everything about the stored bytes; nothing from the browser is trusted. */
async function checkStoredBytes(ticket: UploadTicketRow, bytes: Uint8Array): Promise<BytesCheck> {
  if (bytes.byteLength !== ticket.declared_size)
    return { ok: false, error: "The uploaded file does not match the selected file." };
  const category = TICKET_CATEGORIES[ticket.kind];
  const check = validateUpload({
    category,
    filename: ticket.original_name,
    declaredType: ticket.declared_type,
    bytes,
  });
  if (!check.ok) return check;
  if (check.mimeType === "application/pdf")
    return { ok: true, mimeType: check.mimeType, width: null, height: null };
  const decoded = await verifyImageDecodes(bytes, {
    type: check.mimeType,
    width: check.width!,
    height: check.height!,
  });
  if (!decoded.ok) return decoded;
  return { ok: true, mimeType: check.mimeType, width: check.width!, height: check.height! };
}

export async function finalizeMediaUpload(input: {
  slug: string;
  kind: string;
  ticketId: string;
  version: string;
  altText?: string | null;
}): Promise<MediaResult<FinalizedMedia>> {
  await requireAdmin();
  if (!inventoryEvent(input.slug)) return failure("missing");
  if (!isMediaKind(input.kind) || typeof input.ticketId !== "string" || !UUID.test(input.ticketId))
    return failure("invalid");
  if (typeof input.version !== "string" || !input.version) return failure("conflict");
  const kind = input.kind;
  const alt = normalizeAltText(kind === "image" ? input.altText : null);
  if (!alt.ok) return failure("invalid", `Alt text must be at most ${ALT_TEXT_MAX} characters.`);
  const { client } = cmsAdminClient();

  const claim = await claimTicket(client, input.ticketId, input.slug, kind);
  if (claim.error) {
    console.error(`[cms] claiming an upload failed: ${claim.error.message}`);
    return failure("failed");
  }
  const repeat = () => finalizeRpc(client, input.ticketId, input.slug, kind, input.version, {});
  const done = (data: unknown) => finalized(data as FinalizeRow);
  if (!claim.data) return unclaimed(client, input.ticketId, input.slug, kind, repeat, done);
  const ticket = claim.data as UploadTicketRow;
  return publishAndLink(
    client,
    ticket,
    alt.value,
    (file) => finalizeRpc(client, ticket.id, input.slug, kind, input.version, file),
    repeat,
    async (data) => {
      await expireEventContent(input.slug);
      return done(data);
    },
  );
}

type RpcReply = { data: unknown; error: PgError | null };

/**
 * After a successful claim (events and the gallery): read the staged bytes, validate them, publish
 * exactly those bytes, then link them in one database transaction (`link`). Compensation and
 * recovery as described at the top of this file.
 */
async function publishAndLink<T>(
  client: SupabaseClient,
  ticket: UploadTicketRow,
  altText: string | null,
  link: (file: Record<string, unknown>) => PromiseLike<RpcReply>,
  repeat: () => PromiseLike<RpcReply>,
  done: (data: unknown) => MediaResult<T> | Promise<MediaResult<T>>,
): Promise<MediaResult<T>> {
  const bucket = FILE_RULES[TICKET_CATEGORIES[ticket.kind]].bucket;
  const path = ticket.object_path;

  // 1. The bytes that actually arrived in private staging.
  let bytes: Uint8Array;
  try {
    const download = await client.storage.from(STAGING_BUCKET).download(path);
    if (download.error || !download.data) {
      await releaseTicket(client, ticket);
      return failure("invalid", "The file has not finished uploading. Please try again.");
    }
    bytes = new Uint8Array(await download.data.arrayBuffer());
  } catch (error) {
    console.error(`[cms] reading an upload failed: ${(error as Error).message}`);
    await releaseTicket(client, ticket);
    return failure("failed");
  }

  // 2. Validate. A rejected file never reaches the public bucket.
  const check = await checkStoredBytes(ticket, bytes);
  if (!check.ok) {
    await failTicket(client, ticket, check.error);
    await removeQuietly(client, STAGING_BUCKET, path);
    return failure("rejected", check.error);
  }

  // 3. Promote the validated bytes themselves (not the staging object), with our content type.
  //    Overwriting is safe: no row refers to this path until step 4 commits.
  const stored = await client.storage.from(bucket).upload(path, bytes, {
    contentType: check.mimeType,
    cacheControl: PUBLIC_CACHE_MAX_AGE,
    upsert: true,
  });
  if (stored.error) {
    console.error(`[cms] storing a validated file failed: ${stored.error.message}`);
    await releaseTicket(client, ticket);
    return failure("failed");
  }

  // 4. One transaction: file row, version-checked link with revision, ticket finalized.
  const linked = await link({
    mime_type: check.mimeType,
    size_bytes: bytes.byteLength,
    alt_text: altText,
    width: check.width,
    height: check.height,
  });
  if (linked.error) {
    if (!isDefinite(linked.error)) {
      // Unknown whether it committed: check before touching anything.
      const after = await client
        .from(CMS_TABLES.tickets)
        .select("status")
        .eq("id", ticket.id)
        .maybeSingle();
      if ((after.data as { status?: string } | null)?.status !== "finalized") {
        console.error(`[cms] finalizing ${ticket.id} unconfirmed: ${linked.error.message}`);
        return failure("failed", "The upload could not be confirmed. Reload the page to check.");
      }
      const again = await repeat();
      if (again.error) return failure("failed");
      await removeQuietly(client, STAGING_BUCKET, path);
      return done(again.data);
    }
    // Rolled back: nothing refers to the public copy. Compensate.
    const outcome = databaseFailure(linked.error);
    if (outcome.reason === "failed")
      console.error(`[cms] finalizing ${ticket.id} failed: ${linked.error.message}`);
    await removeQuietly(client, bucket, path);
    await failTicket(client, ticket, outcome.error);
    await removeQuietly(client, STAGING_BUCKET, path);
    return outcome;
  }

  await removeQuietly(client, STAGING_BUCKET, path);
  return done(linked.data);
}

/* ---------- 3. remove, alt text, restore ---------- */

/** Unlinks the event's image or guidelines file (versioned, with a revision). Nothing is deleted. */
export async function removeEventMedia(input: {
  slug: string;
  kind: string;
  version: string;
}): Promise<MediaResult<{ version: string }>> {
  await requireAdmin();
  if (!inventoryEvent(input.slug)) return failure("missing");
  if (!isMediaKind(input.kind)) return failure("invalid");
  if (typeof input.version !== "string" || !input.version) return failure("conflict");
  const { client } = cmsAdminClient();
  const { data, error } = await client.rpc(SET_MEDIA_RPC, {
    p_slug: input.slug,
    p_expected_updated_at: input.version,
    p_kind: input.kind,
    p_file_id: null,
  });
  if (error) {
    const outcome = databaseFailure(error);
    if (outcome.reason === "failed") console.error(`[cms] removing media failed: ${error.message}`);
    return outcome;
  }
  await expireEventContent(input.slug);
  return { ok: true, version: String(data) };
}

/** Sets the alt text of the event's current image (blank = none, decorative). */
export async function updateEventImageAlt(input: {
  slug: string;
  altText: string | null;
}): Promise<MediaResult> {
  await requireAdmin();
  if (!inventoryEvent(input.slug)) return failure("missing");
  const alt = normalizeAltText(input.altText);
  if (!alt.ok) return failure("invalid", `Alt text must be at most ${ALT_TEXT_MAX} characters.`);
  const { client } = cmsAdminClient();
  const event = await client
    .from(CMS_TABLES.events)
    .select("image_file_id")
    .eq("event_slug", input.slug)
    .maybeSingle();
  if (event.error) return failure("failed");
  const fileId = (event.data as { image_file_id: string | null } | null)?.image_file_id;
  if (!fileId) return failure("invalid", "This event has no uploaded image.");
  const updated = await client
    .from(CMS_TABLES.files)
    .update({ alt_text: alt.value })
    .eq("id", fileId)
    .eq("category", "event-image")
    .select("id");
  if (updated.error || !updated.data?.length) return failure("failed");
  await expireEventContent(input.slug);
  return { ok: true };
}

export type MissingMedia = MediaKind[];

/**
 * Restores a revision through cms_restore_event (D5): text, coordinators and media links, except
 * files that no longer exist — those links stay empty and are reported.
 */
export async function restoreEventRevision(
  slug: string,
  version: string,
  revisionId: string,
): Promise<MediaResult<{ version: string; missing: MissingMedia }>> {
  await requireAdmin();
  if (!inventoryEvent(slug)) return failure("missing");
  if (!UUID.test(revisionId)) return failure("invalid");
  const { client } = cmsAdminClient();
  const { data, error } = await client.rpc(RESTORE_RPC, {
    p_slug: slug,
    p_expected_updated_at: version,
    p_revision_id: revisionId,
  });
  if (error) {
    const outcome = databaseFailure(error);
    if (outcome.reason === "failed")
      console.error(`[cms] restoring "${slug}" failed: ${error.message}`);
    return outcome;
  }
  const row = data as { updated_at: string; missing: string[] | null };
  return {
    ok: true,
    version: String(row.updated_at),
    missing: (row.missing ?? []).filter(isMediaKind),
  };
}

/* ---------- 4. gallery uploads (Phase 10.6) — the same pipeline, no event ---------- */

export const FINALIZE_GALLERY_RPC = "cms_finalize_gallery_upload";

/** A ticket for one gallery image: staging path gallery/<uuid>.<ext>, 15 minutes. */
export async function requestGalleryUpload(input: {
  filename: string;
  type: string;
  size: number;
}): Promise<MediaResult<UploadTicket>> {
  await requireAdmin();
  const request = checkFileRequest("gallery-image", {
    filename: input.filename,
    declaredType: input.type,
    size: input.size,
  });
  if (!request.ok) return failure("invalid", request.error);
  const { client } = cmsAdminClient();
  return issueTicket(
    client,
    { event_slug: null, kind: "gallery" },
    storagePath("gallery-image", randomUUID(), request.extension),
    request,
    input.size,
  );
}

export interface FinalizedGalleryItem {
  itemId: string;
  fileId: string;
  repeated: boolean;
}

/**
 * Validates the stored image like event media, publishes it and creates a DRAFT gallery item with
 * its caption and official source in one transaction. Nothing is public until it is published.
 */
export async function finalizeGalleryUpload(
  input: { ticketId: string } & GalleryValues,
): Promise<MediaResult<FinalizedGalleryItem>> {
  await requireAdmin();
  if (typeof input.ticketId !== "string" || !UUID.test(input.ticketId)) return failure("invalid");
  const checked = validateGalleryItem({ ...input, status: "draft" });
  if (!checked.ok) return failure("invalid", Object.values(checked.errors)[0]);
  const { alt_text: altText, status: _status, ...item } = checked.payload;
  void _status;
  const { client } = cmsAdminClient();
  const link = (file: Record<string, unknown>) =>
    client.rpc(FINALIZE_GALLERY_RPC, { p_ticket_id: input.ticketId, p_item: item, p_file: file });
  const repeat = () => link({});
  const done = (data: unknown): MediaResult<FinalizedGalleryItem> => {
    const row = data as { item_id: string; file_id: string; repeated: boolean };
    return { ok: true, itemId: row.item_id, fileId: row.file_id, repeated: row.repeated };
  };

  const claim = await claimTicket(client, input.ticketId, null, "gallery");
  if (claim.error) {
    console.error(`[cms] claiming a gallery upload failed: ${claim.error.message}`);
    return failure("failed");
  }
  if (!claim.data) return unclaimed(client, input.ticketId, null, "gallery", repeat, done);
  return publishAndLink(
    client,
    claim.data as UploadTicketRow,
    altText,
    link,
    repeat,
    async (data) => {
      await expireCollection("gallery");
      return done(data);
    },
  );
}
