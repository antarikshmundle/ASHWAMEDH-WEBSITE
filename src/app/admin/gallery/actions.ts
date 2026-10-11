"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  deleteGalleryItem,
  reorderCollection,
  saveGalleryItem,
  type CollectionOutcome,
} from "@/lib/cms/collections";
import {
  finalizeGalleryUpload,
  requestGalleryUpload,
  type FinalizedGalleryItem,
  type MediaResult,
  type UploadTicket,
} from "@/lib/cms/media-admin";

/**
 * Gallery Server Actions (Phase 10.6). Each re-checks the admin session and passes only primitive
 * values on; the services validate everything again. Uploads use the 10.4 pipeline.
 */

export type { CollectionOutcome, FinalizedGalleryItem, MediaResult, UploadTicket };

const text = (value: unknown) => (typeof value === "string" ? value : "");
const ids = (value: unknown) => (Array.isArray(value) ? value.map(text) : []);
const item = (input: Record<string, unknown> | undefined) => ({
  caption: text(input?.caption),
  altText: text(input?.altText),
  status: text(input?.status),
  sourceKind: text(input?.sourceKind),
  sourceReference: text(input?.sourceReference),
  sourceDate: text(input?.sourceDate),
});

export async function requestGalleryUploadAction(input: {
  filename: unknown;
  type: unknown;
  size: unknown;
}): Promise<MediaResult<UploadTicket>> {
  await requireAdmin();
  return requestGalleryUpload({
    filename: text(input?.filename),
    type: text(input?.type),
    size: typeof input?.size === "number" ? input.size : Number.NaN,
  });
}

export async function finalizeGalleryUploadAction(
  input: Record<string, unknown>,
): Promise<MediaResult<FinalizedGalleryItem>> {
  await requireAdmin();
  return finalizeGalleryUpload({ ticketId: text(input?.ticketId), ...item(input) });
}

export async function saveGalleryItemAction(
  id: string,
  version: string,
  input: Record<string, unknown>,
): Promise<CollectionOutcome> {
  await requireAdmin();
  return saveGalleryItem(text(id), text(version), item(input));
}

export async function deleteGalleryItemAction(
  id: string,
  version: string,
): Promise<CollectionOutcome> {
  await requireAdmin();
  return deleteGalleryItem(text(id), text(version));
}

export async function reorderGalleryAction(order: unknown): Promise<CollectionOutcome> {
  await requireAdmin();
  return reorderCollection("gallery", ids(order));
}
