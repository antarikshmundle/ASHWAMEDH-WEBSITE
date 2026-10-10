import "server-only";
import { cache } from "react";
import { repositorySettings, type FestivalSettings } from "@/lib/festival-settings";
import { contentSourceMode } from "./config";
import { CMS_TABLES, SETTINGS_TAG } from "./schema";
import { cmsPublicReadClient } from "./server";
import { rowToSettings, type FestivalSettingsRow } from "./settings-form";

/**
 * Public festival settings (Phase 10.5). Repository mode returns the repository values unchanged.
 * Database mode reads the single festival_settings row through the data cache (SETTINGS_TAG),
 * refreshed only by expireFestivalSettings() after an admin save. Without a row, the repository
 * values are used — also while the Phase 10.5 migration has not been applied yet (missing table),
 * so code and migration can be deployed in either order. Any other read error throws, like event
 * content (the build fails; a later regeneration keeps the last good page). Deduplicated per request.
 */
export const loadFestivalSettings = cache(async (): Promise<FestivalSettings> => {
  if (contentSourceMode() === "repository") return repositorySettings;
  const { client } = cmsPublicReadClient([SETTINGS_TAG]);
  const { data, error } = await client
    .from(CMS_TABLES.settings)
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      console.warn(
        "[cms] festival_settings does not exist yet (migration pending): using repository values",
      );
      return repositorySettings;
    }
    throw new Error(`Reading festival settings failed: ${error.message}`);
  }
  return rowToSettings((data as FestivalSettingsRow | null) ?? null);
});
