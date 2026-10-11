import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKETS, CMS_TABLES, STAGING_BUCKET } from "./schema";

/**
 * Cleanup of unused event media (Phase 10.4.6, D4). Used by `npm run cms:cleanup` (trusted
 * machine, service key) and by the admin Files page (after requireAdmin()). Dry run by default:
 * planCleanup() only lists; applyCleanup() deletes, re-checking every item right before it.
 *
 * Deletes ONLY, all within `events/` and `gallery/` (the folders the media service writes):
 *   1. file rows no event uses, unused for longer than the grace (24 h since they were detached,
 *      or since upload for a row that was never attached) — the row first (the database's
 *      ON DELETE RESTRICT refuses a row that is in use), then its object;
 *   2. public objects without any file row, older than the grace (left by an interrupted upload or
 *      an object removal that failed earlier);
 *   3. staging objects older than one hour.
 * Never anything an active upload ticket (issued and unexpired, or processing) points to.
 * Running it again is safe (idempotent); a step that fails is reported and retried next time.
 *
 * Revisions may still name a deleted file: restoring such a revision leaves that slot empty and
 * reports it (D5). Deleting a Storage object does not purge copies already cached by the Supabase
 * CDN or the Next.js image optimizer — see the runbook in docs/architecture/admin-cms.md.
 */

export const CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000;
export const STAGING_GRACE_MS = 60 * 60 * 1000;
/** Folders the media pipeline writes (events since 10.4, gallery since 10.6). */
const MEDIA_FOLDERS = ["events/", "gallery/"] as const;
const inMediaFolder = (path: string) => MEDIA_FOLDERS.some((folder) => path.startsWith(folder));
const PUBLIC_BUCKETS = [BUCKETS.documents, BUCKETS.images] as const;

export interface CleanupFile {
  id: string;
  bucket: string;
  path: string;
  uploaded_at: string;
  detached_at: string | null;
}
export interface CleanupTicket {
  object_path: string;
  status: string;
  expires_at: string;
}
export interface CleanupObject {
  bucket: string;
  path: string;
  /** Last write (the later of created / updated). */
  writtenAt: string;
}
export interface CleanupInputs {
  now: Date;
  files: CleanupFile[];
  /** File ids in use: linked by an event (image / guidelines) or by a gallery item. */
  referenced: Set<string>;
  tickets: CleanupTicket[];
  objects: CleanupObject[];
}

export interface CleanupPlan {
  now: string;
  files: { id: string; bucket: string; path: string; unusedSince: string }[];
  orphans: CleanupObject[];
  staging: CleanupObject[];
  kept: { inUse: number; inGrace: number; activeUpload: number; outsideEvents: number };
}

const ms = (iso: string) => Date.parse(iso);

/** Pure: what may be deleted now. */
export function planCleanup(input: CleanupInputs): CleanupPlan {
  const now = input.now.getTime();
  const graceCutoff = now - CLEANUP_GRACE_MS;
  const stagingCutoff = now - STAGING_GRACE_MS;
  const active = new Set(
    input.tickets
      .filter((t) => t.status === "processing" || (t.status === "issued" && ms(t.expires_at) > now))
      .map((t) => t.object_path),
  );
  const kept = { inUse: 0, inGrace: 0, activeUpload: 0, outsideEvents: 0 };
  const plan: CleanupPlan = {
    now: input.now.toISOString(),
    files: [],
    orphans: [],
    staging: [],
    kept,
  };

  for (const file of input.files) {
    const since = file.detached_at ?? file.uploaded_at;
    if (!inMediaFolder(file.path)) kept.outsideEvents++;
    else if (input.referenced.has(file.id)) kept.inUse++;
    else if (active.has(file.path)) kept.activeUpload++;
    else if (!(ms(since) <= graceCutoff)) kept.inGrace++;
    else plan.files.push({ id: file.id, bucket: file.bucket, path: file.path, unusedSince: since });
  }

  const rows = new Set(input.files.map((f) => `${f.bucket}/${f.path}`));
  for (const object of input.objects) {
    if (!inMediaFolder(object.path)) continue;
    const written = ms(object.writtenAt);
    if (object.bucket === STAGING_BUCKET) {
      if (active.has(object.path)) kept.activeUpload++;
      else if (!(written <= stagingCutoff)) kept.inGrace++;
      else plan.staging.push(object);
    } else if ((PUBLIC_BUCKETS as readonly string[]).includes(object.bucket)) {
      if (rows.has(`${object.bucket}/${object.path}`)) continue; // handled with its row
      if (active.has(object.path)) kept.activeUpload++;
      else if (!(written <= graceCutoff)) kept.inGrace++;
      else plan.orphans.push(object);
    }
  }
  return plan;
}

/* ---------- loading (read-only) ---------- */

async function listObjects(client: SupabaseClient, bucket: string): Promise<CleanupObject[]> {
  const out: CleanupObject[] = [];
  const walk = async (prefix: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.storage
        .from(bucket)
        .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`Listing ${bucket}/${prefix} failed: ${error.message}`);
      for (const item of data) {
        const path = `${prefix}/${item.name}`;
        if (item.id === null) await walk(path);
        else {
          const written = [item.created_at, item.updated_at].filter(Boolean).map((v) => ms(v!));
          // Unknown age → treated as just written (kept).
          const at = written.length ? Math.max(...written) : Date.now();
          out.push({ bucket, path, writtenAt: new Date(at).toISOString() });
        }
      }
      if (data.length < 1000) break;
    }
  };
  for (const folder of MEDIA_FOLDERS) await walk(folder.slice(0, -1));
  return out;
}

export async function loadCleanupInputs(
  client: SupabaseClient,
  now = new Date(),
): Promise<CleanupInputs> {
  const files = await client
    .from(CMS_TABLES.files)
    .select("id, bucket, path, uploaded_at, detached_at");
  if (files.error) throw new Error(`Loading files failed: ${files.error.message}`);
  const events = await client.from(CMS_TABLES.events).select("image_file_id, guidelines_file_id");
  if (events.error) throw new Error(`Loading events failed: ${events.error.message}`);
  // Gallery items reference their files too (Phase 10.6). Before that migration: no table, none.
  const gallery = await client.from(CMS_TABLES.gallery).select("file_id");
  if (gallery.error && gallery.error.code !== "PGRST205" && gallery.error.code !== "42P01")
    throw new Error(`Loading gallery items failed: ${gallery.error.message}`);
  const tickets = await client
    .from(CMS_TABLES.tickets)
    .select("object_path, status, expires_at")
    .in("status", ["issued", "processing"]);
  if (tickets.error) throw new Error(`Loading upload tickets failed: ${tickets.error.message}`);
  const referenced = new Set<string>();
  for (const row of events.data as {
    image_file_id: string | null;
    guidelines_file_id: string | null;
  }[]) {
    if (row.image_file_id) referenced.add(row.image_file_id);
    if (row.guidelines_file_id) referenced.add(row.guidelines_file_id);
  }
  for (const row of (gallery.data ?? []) as { file_id: string }[]) referenced.add(row.file_id);
  const objects: CleanupObject[] = [];
  for (const bucket of [...PUBLIC_BUCKETS, STAGING_BUCKET])
    objects.push(...(await listObjects(client, bucket)));
  return {
    now,
    files: files.data as CleanupFile[],
    referenced,
    tickets: tickets.data as CleanupTicket[],
    objects,
  };
}

/* ---------- applying (deletes, each item re-checked) ---------- */

export interface CleanupReport {
  deleted: { files: string[]; orphans: string[]; staging: string[] };
  skipped: string[];
  failures: string[];
}

async function activeTicketFor(client: SupabaseClient, path: string, now: Date) {
  const { data, error } = await client
    .from(CMS_TABLES.tickets)
    .select("status, expires_at")
    .eq("object_path", path)
    .in("status", ["issued", "processing"]);
  if (error) throw new Error(error.message);
  return (data as { status: string; expires_at: string }[]).some(
    (t) => t.status === "processing" || ms(t.expires_at) > now.getTime(),
  );
}

export async function applyCleanup(
  client: SupabaseClient,
  plan: CleanupPlan,
): Promise<CleanupReport> {
  const now = new Date(plan.now);
  const cutoff = new Date(now.getTime() - CLEANUP_GRACE_MS).toISOString();
  const report: CleanupReport = {
    deleted: { files: [], orphans: [], staging: [] },
    skipped: [],
    failures: [],
  };

  for (const file of plan.files) {
    const label = `${file.bucket}/${file.path}`;
    try {
      if (await activeTicketFor(client, file.path, now)) {
        report.skipped.push(`${label}: an upload is active`);
        continue;
      }
      // Still unused for the whole grace (a re-attached file has detached_at = NULL); RESTRICT
      // makes the database refuse it if an event uses it again.
      const { data, error } = await client
        .from(CMS_TABLES.files)
        .delete()
        .eq("id", file.id)
        .eq("bucket", file.bucket)
        .eq("path", file.path)
        .or(
          `and(detached_at.not.is.null,detached_at.lte."${cutoff}"),and(detached_at.is.null,uploaded_at.lte."${cutoff}")`,
        )
        .select("id");
      if (error) {
        report.skipped.push(
          `${label}: ${error.code === "23503" ? "in use by an event again" : `not deleted (${error.message})`}`,
        );
        continue;
      }
      if (!data?.length) {
        report.skipped.push(`${label}: no longer eligible`);
        continue;
      }
      const removed = await client.storage.from(file.bucket).remove([file.path]);
      if (removed.error) {
        report.failures.push(
          `${label}: row deleted, object left for the next run (${removed.error.message})`,
        );
      }
      report.deleted.files.push(label);
    } catch (error) {
      report.failures.push(`${label}: ${(error as Error).message}`);
    }
  }

  for (const object of [...plan.orphans, ...plan.staging]) {
    const label = `${object.bucket}/${object.path}`;
    const list = object.bucket === STAGING_BUCKET ? report.deleted.staging : report.deleted.orphans;
    try {
      if (await activeTicketFor(client, object.path, now)) {
        report.skipped.push(`${label}: an upload is active`);
        continue;
      }
      if (object.bucket !== STAGING_BUCKET) {
        const row = await client
          .from(CMS_TABLES.files)
          .select("id")
          .eq("bucket", object.bucket)
          .eq("path", object.path)
          .maybeSingle();
        if (row.error) throw new Error(row.error.message);
        if (row.data) {
          report.skipped.push(`${label}: now has a file row`);
          continue;
        }
      }
      const removed = await client.storage.from(object.bucket).remove([object.path]);
      if (removed.error) report.failures.push(`${label}: ${removed.error.message}`);
      else list.push(label);
    } catch (error) {
      report.failures.push(`${label}: ${(error as Error).message}`);
    }
  }
  return report;
}
