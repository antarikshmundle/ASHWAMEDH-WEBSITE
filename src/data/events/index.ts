import type { EventRecord, EventVertical } from "@/types/festival";
import { buildEvent } from "./build";
import { eventDetails } from "./details";
import { eventInventory } from "./inventory";
import { buildSlugIndex, resolveSlug, type SlugResolution } from "./slugs";

export { eventInventory, type EventSlug } from "./inventory";
export { eventDetails } from "./details";
export { buildEvent } from "./build";
export { buildSlugIndex, resolveSlug, type SlugIndex, type SlugResolution } from "./slugs";

/** Validated at module load: a slug conflict fails the build instead of breaking a URL. */
const slugIndex = buildSlugIndex(eventInventory);

/** Former event slugs that permanently redirect to a live event page. */
export const legacyEventSlugs: readonly string[] = [...slugIndex.legacy.keys()];

/** A live slug, a former slug (→ its live slug), or unknown (→ 404). */
export function resolveEventSlug(slug: string): SlugResolution {
  return resolveSlug(slugIndex, slug);
}

/** All events resolved from the frozen inventory + the official details registry. */
export const events: readonly EventRecord[] = eventInventory.map((identity) =>
  buildEvent(identity, eventDetails[identity.slug]),
);

export function getEventsByVertical(vertical: EventVertical): EventRecord[] {
  return events.filter((event) => event.category === vertical);
}

export function getEventBySlug(slug: string): EventRecord | undefined {
  return events.find((event) => event.slug === slug);
}
