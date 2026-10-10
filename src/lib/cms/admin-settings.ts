import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import { CMS_TABLES } from "./schema";
import { cmsAdminClient } from "./server";
import type { FestivalSettingsRow, SettingsPayload } from "./settings-form";

/** Admin data access for the festival settings (Phase 10.5). Server-only, uncached, service role. */

export const SAVE_SETTINGS_RPC = "cms_save_settings";

export async function getSettingsForEdit(): Promise<
  (FestivalSettingsRow & { updated_at: string }) | null
> {
  await requireAdmin();
  const { client } = cmsAdminClient();
  const { data, error } = await client
    .from(CMS_TABLES.settings)
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Loading festival settings failed: ${error.message}`);
  return (data as (FestivalSettingsRow & { updated_at: string }) | null) ?? null;
}

export type SettingsSaveOutcome =
  { ok: true; version: string } | { ok: false; reason: "conflict" | "missing" | "failed" };

/** Atomic save through cms_save_settings (lock, version check, revision, update). */
export async function saveSettings(
  expectedVersion: string,
  payload: SettingsPayload,
): Promise<SettingsSaveOutcome> {
  await requireAdmin();
  const { client } = cmsAdminClient();
  const { data, error } = await client.rpc(SAVE_SETTINGS_RPC, {
    p_expected_updated_at: expectedVersion,
    p_content: payload,
  });
  if (error) {
    if (error.message.includes("cms_version_conflict")) return { ok: false, reason: "conflict" };
    if (error.message.includes("cms_settings_missing")) return { ok: false, reason: "missing" };
    console.error(`[cms] saving festival settings failed: ${error.message}`);
    return { ok: false, reason: "failed" };
  }
  return { ok: true, version: String(data) };
}
