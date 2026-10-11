import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { publicFileUrl } from "./client";
import {
  validateGalleryItem,
  validateTeamMember,
  type GalleryValues,
  type TeamValues,
} from "./collection-form";
import { contentSourceMode } from "./config";
import { expireCollection } from "./revalidate";
import { BUCKETS, CMS_TABLES, GALLERY_TAG, TEAM_TAG } from "./schema";
import { cmsAdminClient, cmsPublicReadClient } from "./server";

/**
 * Gallery and Team (Phase 10.6). Public loaders return PUBLISHED items only, ordered, through the
 * data cache (cms:gallery / cms:team). Repository mode, or before the migration (missing table):
 * nothing — the pages keep their Coming Soon state. Admin functions check the session, validate
 * on the server and use the row's updated_at as its version.
 */

const GALLERY_PATH =
  /^gallery\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const missingTable = (code?: string) => code === "PGRST205" || code === "42P01";

export interface PublicGalleryItem {
  id: string;
  caption: string;
  src: string;
  alt: string;
}
export interface PublicTeamGroup {
  label: string;
  members: { id: string; name: string; role: string }[];
}

type FileCols = { bucket: string; path: string; alt_text: string | null };
type GalleryRow = {
  id: string;
  caption: string;
  status: string;
  sort_order: number;
  source_kind: string;
  source_reference: string;
  source_date: string;
  updated_at: string;
  file: FileCols | null;
};
type TeamRow = {
  id: string;
  name: string;
  role: string;
  group_label: string;
  status: string;
  sort_order: number;
  source_kind: string;
  source_reference: string;
  source_date: string;
  updated_at: string;
};
const GALLERY_SELECT =
  "id, caption, status, sort_order, source_kind, source_reference, source_date, updated_at, file:cms_files!gallery_items_file_id_fkey(bucket, path, alt_text)";

/** Public URL of a gallery file — only the exact images-bucket gallery path. */
function galleryFileUrl(projectUrl: string, file: FileCols | null): string | null {
  if (!file || file.bucket !== BUCKETS.images || !GALLERY_PATH.test(file.path)) return null;
  return publicFileUrl(projectUrl, file.bucket, file.path);
}

export const loadPublishedGallery = cache(async (): Promise<PublicGalleryItem[]> => {
  if (contentSourceMode() === "repository") return [];
  const { client, credentials } = cmsPublicReadClient([GALLERY_TAG]);
  const { data, error } = await client
    .from(CMS_TABLES.gallery)
    .select(GALLERY_SELECT)
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");
  if (error) {
    if (missingTable(error.code)) return [];
    throw new Error(`Reading the gallery failed: ${error.message}`);
  }
  return (data as unknown as GalleryRow[]).flatMap((row) => {
    const src = galleryFileUrl(credentials.url, row.file);
    return src ? [{ id: row.id, caption: row.caption, src, alt: row.file?.alt_text ?? "" }] : [];
  });
});

export const loadPublishedTeam = cache(async (): Promise<PublicTeamGroup[]> => {
  if (contentSourceMode() === "repository") return [];
  const { client } = cmsPublicReadClient([TEAM_TAG]);
  const { data, error } = await client
    .from(CMS_TABLES.team)
    .select("id, name, role, group_label")
    .eq("status", "published")
    .order("sort_order")
    .order("created_at");
  if (error) {
    if (missingTable(error.code)) return [];
    throw new Error(`Reading the team failed: ${error.message}`);
  }
  // Groups in the order of their first member.
  const groups = new Map<string, PublicTeamGroup>();
  for (const m of data as Pick<TeamRow, "id" | "name" | "role" | "group_label">[]) {
    const group = groups.get(m.group_label) ?? { label: m.group_label, members: [] };
    group.members.push({ id: m.id, name: m.name, role: m.role });
    groups.set(m.group_label, group);
  }
  return [...groups.values()];
});

/* ---------- admin ---------- */

export type AdminGalleryItem = GalleryRow & { url: string | null };
export type AdminTeamMember = TeamRow;
export type CollectionOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "conflict" | "failed";
      error: string;
      errors?: Record<string, string>;
    };

const CONFLICT = "This item was changed elsewhere. Reload the page and try again.";
const FAILED = "Something went wrong — nothing was changed. Please try again.";
const fail = (reason: "conflict" | "failed", error = reason === "conflict" ? CONFLICT : FAILED) =>
  ({ ok: false, reason, error }) as const;

export async function listGalleryForAdmin(): Promise<AdminGalleryItem[] | null> {
  await requireAdmin();
  const { client, credentials } = cmsAdminClient();
  const { data, error } = await client
    .from(CMS_TABLES.gallery)
    .select(GALLERY_SELECT)
    .order("sort_order")
    .order("created_at");
  if (error) {
    if (missingTable(error.code)) return null;
    throw new Error(`Loading the gallery failed: ${error.message}`);
  }
  return (data as unknown as GalleryRow[]).map((row) => ({
    ...row,
    url: galleryFileUrl(credentials.url, row.file),
  }));
}

export async function listTeamForAdmin(): Promise<AdminTeamMember[] | null> {
  await requireAdmin();
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(CMS_TABLES.team)
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) {
    if (missingTable(error.code)) return null;
    throw new Error(`Loading the team failed: ${error.message}`);
  }
  return data as TeamRow[];
}

/** Caption, alt text, status and source of one gallery item (version-checked). */
export async function saveGalleryItem(
  id: string,
  version: string,
  values: GalleryValues,
): Promise<CollectionOutcome> {
  await requireAdmin();
  const checked = validateGalleryItem(values);
  if (!checked.ok)
    return {
      ok: false,
      reason: "invalid",
      error: "Please fix the marked fields.",
      errors: checked.errors,
    };
  const { alt_text, ...item } = checked.payload;
  const { client } = cmsAdminClient();
  const updated = await client
    .from(CMS_TABLES.gallery)
    .update(item)
    .eq("id", id)
    .eq("updated_at", version)
    .select("file_id");
  if (updated.error) return fail("failed");
  const row = (updated.data as { file_id: string }[])[0];
  if (!row) return fail("conflict");
  const file = await client
    .from(CMS_TABLES.files)
    .update({ alt_text })
    .eq("id", row.file_id)
    .eq("category", "gallery-image");
  await expireCollection("gallery");
  return file.error
    ? fail("failed", "The item was saved, but its alt text was not. Please try again.")
    : { ok: true };
}

export async function deleteGalleryItem(id: string, version: string): Promise<CollectionOutcome> {
  await requireAdmin();
  const { client } = cmsAdminClient();
  const { error } = await client.rpc("cms_delete_gallery_item", {
    p_id: id,
    p_expected_updated_at: version,
  });
  if (error)
    return fail(
      /cms_version_conflict|cms_unknown_item/.test(error.message) ? "conflict" : "failed",
    );
  await expireCollection("gallery");
  return { ok: true };
}

export async function createTeamMember(values: TeamValues): Promise<CollectionOutcome> {
  await requireAdmin();
  const checked = validateTeamMember(values);
  if (!checked.ok)
    return {
      ok: false,
      reason: "invalid",
      error: "Please fix the marked fields.",
      errors: checked.errors,
    };
  const { client } = cmsAdminClient();
  const last = await client
    .from(CMS_TABLES.team)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (last.error) return fail("failed");
  const sort_order = ((last.data as { sort_order: number }[])[0]?.sort_order ?? -1) + 1;
  const { error } = await client.from(CMS_TABLES.team).insert({ ...checked.payload, sort_order });
  if (error) return fail("failed");
  await expireCollection("team");
  return { ok: true };
}

export async function saveTeamMember(
  id: string,
  version: string,
  values: TeamValues,
): Promise<CollectionOutcome> {
  await requireAdmin();
  const checked = validateTeamMember(values);
  if (!checked.ok)
    return {
      ok: false,
      reason: "invalid",
      error: "Please fix the marked fields.",
      errors: checked.errors,
    };
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(CMS_TABLES.team)
    .update(checked.payload)
    .eq("id", id)
    .eq("updated_at", version)
    .select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("conflict");
  await expireCollection("team");
  return { ok: true };
}

export async function deleteTeamMember(id: string, version: string): Promise<CollectionOutcome> {
  await requireAdmin();
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(CMS_TABLES.team)
    .delete()
    .eq("id", id)
    .eq("updated_at", version)
    .select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("conflict");
  await expireCollection("team");
  return { ok: true };
}

/** The whole order at once (every id exactly once); refused if the list changed meanwhile. */
export async function reorderCollection(
  collection: "gallery" | "team",
  ids: string[],
): Promise<CollectionOutcome> {
  await requireAdmin();
  const { client } = cmsAdminClient();
  const { error } = await client.rpc(
    collection === "gallery" ? "cms_reorder_gallery" : "cms_reorder_team",
    { p_ids: ids },
  );
  if (error) return fail(/cms_invalid_order/.test(error.message) ? "conflict" : "failed");
  await expireCollection(collection);
  return { ok: true };
}
