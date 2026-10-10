"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  finalizeMediaUpload,
  removeEventMedia,
  requestMediaUpload,
  updateEventImageAlt,
  type FinalizedMedia,
  type MediaResult,
  type UploadTicket,
} from "@/lib/cms/media-admin";

/**
 * Event media Server Actions (Phase 10.4.3). The media panels (10.4.5) call them from the editor.
 * Next.js rejects cross-origin calls; each action re-checks the admin session and passes only
 * primitive values on, so nothing from the browser chooses a bucket, a path or a file id. The
 * service (src/lib/cms/media-admin.ts) validates everything again on the server.
 */

// Types for the client media panels (client components never import src/lib/cms).
export type { FinalizedMedia, MediaResult, UploadTicket } from "@/lib/cms/media-admin";

const text = (value: unknown) => (typeof value === "string" ? value : "");

export async function requestMediaUploadAction(
  slug: string,
  input: { kind: unknown; filename: unknown; type: unknown; size: unknown; version: unknown },
): Promise<MediaResult<UploadTicket>> {
  await requireAdmin();
  return requestMediaUpload({
    slug: text(slug),
    kind: text(input?.kind),
    filename: text(input?.filename),
    type: text(input?.type),
    size: typeof input?.size === "number" ? input.size : Number.NaN,
    version: text(input?.version),
  });
}

export async function finalizeMediaUploadAction(
  slug: string,
  input: { kind: unknown; ticketId: unknown; version: unknown; altText?: unknown },
): Promise<MediaResult<FinalizedMedia>> {
  await requireAdmin();
  return finalizeMediaUpload({
    slug: text(slug),
    kind: text(input?.kind),
    ticketId: text(input?.ticketId),
    version: text(input?.version),
    altText: typeof input?.altText === "string" ? input.altText : null,
  });
}

export async function removeEventMediaAction(
  slug: string,
  input: { kind: unknown; version: unknown },
): Promise<MediaResult<{ version: string }>> {
  await requireAdmin();
  return removeEventMedia({
    slug: text(slug),
    kind: text(input?.kind),
    version: text(input?.version),
  });
}

export async function updateEventImageAltAction(
  slug: string,
  input: { altText: unknown },
): Promise<MediaResult> {
  await requireAdmin();
  return updateEventImageAlt({
    slug: text(slug),
    altText: typeof input?.altText === "string" ? input.altText : null,
  });
}
