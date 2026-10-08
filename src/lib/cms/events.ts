import "server-only";
import { buildEvent } from "@/data/events/build";
import { eventDetails, eventInventory, events as repositoryEvents } from "@/data/events";
import type { EventDetailsInput, EventRecord, EventVertical } from "@/types/festival";
import { contentSourceMode } from "./config";
import { recordToDetails } from "./mapping";
import {
  CMS_TABLES,
  EVENT_CONTENT_SELECT,
  EVENTS_TAG,
  eventTag,
  type EventContentRecord,
} from "./schema";
import { cmsPublicReadClient } from "./server";

/**
 * Public event content (Phase 10.2):
 *
 *   frozen inventory (repository) + editable content (repository or database)
 *     → buildEvent() (validation, normalisation) → display layer → pages
 *
 * Repository mode returns exactly the existing records. Database mode reads events_content with
 * tagged, cached requests: the listing pages use EVENTS_TAG, an event page uses eventTag(slug).
 * An event without a row falls back to its repository details. Invalid stored content throws:
 * at build time the build fails; during a later regeneration Next.js keeps serving the last good
 * page.
 */

async function readContent(slug?: string): Promise<Map<string, EventDetailsInput | undefined>> {
  const tags = slug ? [eventTag(slug)] : [EVENTS_TAG];
  const { client, credentials } = cmsPublicReadClient(tags);
  let query = client.from(CMS_TABLES.events).select(EVENT_CONTENT_SELECT);
  if (slug) query = query.eq("event_slug", slug);
  const { data, error } = await query;
  if (error) throw new Error(`Reading CMS event content failed: ${error.message}`);
  const rows = (data ?? []) as unknown as EventContentRecord[];
  return new Map(rows.map((row) => [row.event_slug, recordToDetails(row, credentials.url)]));
}

function merge(content: Map<string, EventDetailsInput | undefined>, slugs: readonly string[]) {
  return eventInventory
    .filter((identity) => slugs.includes(identity.slug))
    .map((identity) =>
      buildEvent(
        identity,
        content.has(identity.slug) ? content.get(identity.slug) : eventDetails[identity.slug],
      ),
    );
}

/** All events, in inventory order. */
export async function loadEvents(): Promise<EventRecord[]> {
  if (contentSourceMode() === "repository") return [...repositoryEvents];
  return merge(
    await readContent(),
    eventInventory.map((e) => e.slug),
  );
}

export async function loadEventsByVertical(vertical: EventVertical): Promise<EventRecord[]> {
  return (await loadEvents()).filter((event) => event.category === vertical);
}

/** One event by its live slug, or `undefined` for a slug that is not in the inventory. */
export async function loadEvent(slug: string): Promise<EventRecord | undefined> {
  if (!eventInventory.some((identity) => identity.slug === slug)) return undefined;
  if (contentSourceMode() === "repository") {
    return repositoryEvents.find((event) => event.slug === slug);
  }
  return merge(await readContent(slug), [slug])[0];
}
