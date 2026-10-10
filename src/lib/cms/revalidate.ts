import "server-only";
import { updateTag } from "next/cache";
import { eventInventory } from "@/data/events";
import { requireAdmin } from "@/lib/admin/auth";
import { EVENTS_TAG, SETTINGS_TAG, eventTag } from "./schema";

/**
 * Targeted refresh after an admin saves event content (Phase 10.2). Call it from the Server
 * Action that performed the save. It expires only:
 *   - that event's page data (eventTag(slug)), and
 *   - the shared list used by the listing pages (EVENTS_TAG).
 * Other event pages keep their cache. The next visit renders fresh content (read-your-writes).
 */
export async function expireEventContent(slug: string): Promise<void> {
  await requireAdmin();
  if (!eventInventory.some((identity) => identity.slug === slug)) {
    throw new Error(`Unknown event slug "${slug}".`);
  }
  updateTag(eventTag(slug));
  updateTag(EVENTS_TAG);
}

/**
 * Refresh after the festival settings are saved (Phase 10.5). The footer shows contact details and
 * social links on every page, so every page that read the settings is regenerated on its next visit.
 */
export async function expireFestivalSettings(): Promise<void> {
  await requireAdmin();
  updateTag(SETTINGS_TAG);
}
