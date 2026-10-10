import "server-only";
import { eventInventory } from "@/data/events";
import { requireAdmin } from "@/lib/admin/auth";
import { formatIst } from "@/lib/format-ist";
import type { EventMediaSummary, MediaFileSummary } from "@/types/admin-media";
import { publicFileUrl } from "./client";
import type { EventIdentity, RegistrationStatus } from "@/types/festival";
import type { CoordinatorPayload, EventContentPayload } from "./event-form";
import {
  CMS_TABLES,
  type Bucket,
  type CoordinatorRow,
  type EventContentRecord,
  type EventContentRow,
} from "./schema";
import { cmsAdminClient } from "./server";

/**
 * Admin data access for the event editor (Phase 10.3). Server-only, uncached, service role.
 * Every function checks the admin session first. Identity always comes from the repository
 * inventory; the database only holds content for those slugs.
 */

export const REVISIONS_TABLE = "events_content_revisions";
export const SAVE_EVENT_RPC = "cms_save_event";

export function inventoryEvent(slug: string): EventIdentity | undefined {
  return eventInventory.find((identity) => identity.slug === slug);
}

export interface AdminEventSummary {
  identity: EventIdentity;
  status: RegistrationStatus;
  hasContent: boolean;
  updatedAt: string | null;
  /** False when the seed has not created a row for this slug yet. */
  stored: boolean;
}

export async function listEventsForAdmin(): Promise<AdminEventSummary[]> {
  await requireAdmin();
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(CMS_TABLES.events)
    .select("event_slug, registration_status, source_kind, updated_at");
  if (error) throw new Error(`Loading events failed: ${error.message}`);
  type SummaryRow = Pick<EventContentRow, "event_slug" | "registration_status" | "source_kind"> & {
    updated_at: string;
  };
  const rows = new Map((data as SummaryRow[]).map((row) => [row.event_slug, row]));
  return eventInventory.map((identity) => {
    const row = rows.get(identity.slug);
    return {
      identity,
      status: row?.registration_status ?? "not-open",
      hasContent: Boolean(row?.source_kind),
      updatedAt: row?.updated_at ?? null,
      stored: Boolean(row),
    };
  });
}

/** Linked file details the editor shows (Phase 10.4.5). */
export interface AdminFileColumns {
  bucket: Bucket;
  path: string;
  alt_text?: string | null;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  width?: number | null;
  height?: number | null;
}

/** The editor's select: content, coordinators and the linked files with their metadata. */
export const ADMIN_EVENT_SELECT = [
  "*",
  "event_coordinators(name,designation,phone,email,sort_order)",
  "guidelines_file:cms_files!events_content_guidelines_file_id_fkey(bucket,path,original_name,mime_type,size_bytes,uploaded_at)",
  "image_file:cms_files!events_content_image_file_id_fkey(bucket,path,alt_text,original_name,mime_type,size_bytes,uploaded_at,width,height)",
].join(",");

export type AdminEventRecord = Omit<EventContentRecord, "guidelines_file" | "image_file"> & {
  updated_at: string;
  guidelines_file: AdminFileColumns | null;
  image_file: AdminFileColumns | null;
};

export interface EventForEdit {
  identity: EventIdentity;
  /** `null` when the seed has not created the row yet (the editor cannot save then). */
  record: AdminEventRecord | null;
  /** Image or uploaded files (Phase 10.4): content too, so a source stays required. */
  hasManagedFiles: boolean;
}

export function mediaSummary(record: AdminEventRecord, projectUrl: string): EventMediaSummary {
  const file = (f: AdminFileColumns | null): MediaFileSummary | null =>
    f && {
      name: f.original_name,
      sizeBytes: f.size_bytes,
      uploadedLabel: formatIst(f.uploaded_at),
      url: publicFileUrl(projectUrl, f.bucket, f.path),
      width: f.width ?? null,
      height: f.height ?? null,
      altText: f.alt_text ?? null,
    };
  return {
    image: file(record.image_file),
    imagePath: record.image_path,
    guidelines: file(record.guidelines_file),
    guidelinesUrl: record.guidelines_url,
    hasSource: Boolean(record.source_kind),
  };
}

export async function getEventForEdit(slug: string): Promise<EventForEdit | undefined> {
  await requireAdmin();
  const identity = inventoryEvent(slug);
  if (!identity) return undefined;
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(CMS_TABLES.events)
    .select(ADMIN_EVENT_SELECT)
    .eq("event_slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Loading the event failed: ${error.message}`);
  const record = (data as unknown as AdminEventRecord | null) ?? null;
  return {
    identity,
    record,
    hasManagedFiles: Boolean(
      record && (record.image_file_id || record.image_path || record.guidelines_file_id),
    ),
  };
}

export type SaveOutcome =
  { ok: true; version: string } | { ok: false; reason: "conflict" | "missing" | "failed" };

/** Atomic save through cms_save_event (lock, version check, revision, update, coordinators). */
export async function saveEventContent(
  slug: string,
  expectedVersion: string,
  content: EventContentPayload,
  coordinators: CoordinatorPayload[],
): Promise<SaveOutcome> {
  await requireAdmin();
  if (!inventoryEvent(slug)) return { ok: false, reason: "missing" };
  const { client } = cmsAdminClient();
  const { data, error } = await client.rpc(SAVE_EVENT_RPC, {
    p_slug: slug,
    p_expected_updated_at: expectedVersion,
    p_content: content,
    p_coordinators: coordinators,
  });
  if (error) {
    if (error.message.includes("cms_version_conflict")) return { ok: false, reason: "conflict" };
    if (error.message.includes("cms_unknown_event")) return { ok: false, reason: "missing" };
    console.error(`[cms] saving "${slug}" failed: ${error.message}`);
    return { ok: false, reason: "failed" };
  }
  return { ok: true, version: String(data) };
}

export interface RevisionSummary {
  id: string;
  savedAt: string;
  /** savedAt in Indian time, for display. */
  savedLabel: string;
  venue: string | null;
  status: RegistrationStatus;
  hasContent: boolean;
  coordinators: number;
}

export async function listRevisions(slug: string, limit = 20): Promise<RevisionSummary[]> {
  await requireAdmin();
  if (!inventoryEvent(slug)) return [];
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(REVISIONS_TABLE)
    .select("id, saved_at, content, coordinators")
    .eq("event_slug", slug)
    .order("saved_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Loading revisions failed: ${error.message}`);
  return (
    data as { id: string; saved_at: string; content: EventContentRow; coordinators: unknown[] }[]
  ).map((row) => ({
    id: row.id,
    savedAt: row.saved_at,
    savedLabel: formatIst(row.saved_at),
    venue: row.content.venue,
    status: row.content.registration_status,
    hasContent: Boolean(row.content.source_kind),
    coordinators: row.coordinators.length,
  }));
}

/** A stored revision as a content record (for validation before restoring it). */
export async function getRevision(
  slug: string,
  id: string,
): Promise<EventContentRecord | undefined> {
  await requireAdmin();
  if (!inventoryEvent(slug) || !/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(REVISIONS_TABLE)
    .select("content, coordinators")
    .eq("id", id)
    .eq("event_slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Loading the revision failed: ${error.message}`);
  if (!data) return undefined;
  const row = data as {
    content: EventContentRow;
    coordinators: Omit<CoordinatorRow, "event_slug">[];
  };
  return {
    ...row.content,
    event_coordinators: row.coordinators,
    guidelines_file: null,
    image_file: null,
  };
}
