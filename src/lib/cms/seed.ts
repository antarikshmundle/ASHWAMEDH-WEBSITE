import type { SupabaseClient } from "@supabase/supabase-js";
import { eventDetails, eventInventory } from "@/data/events";
import { identityToSeedRows } from "./mapping";
import { CMS_TABLES, type CoordinatorRow, type EventContentRow } from "./schema";

/**
 * Idempotent CMS seed (Phase 10.2): one events_content row per frozen inventory slug, built from
 * the repository details (src/data/events/details.ts) through buildEvent().
 *
 * - Inserts only slugs that have no row yet. Existing rows — including anything an admin has
 *   edited — are never overwritten, so the seed is safe to run any number of times.
 * - Never deletes. Rows for slugs that are not in the inventory are reported, not removed.
 */
export interface SeedStore {
  existingSlugs(): Promise<Set<string>>;
  insertEvents(rows: EventContentRow[]): Promise<void>;
  insertCoordinators(rows: CoordinatorRow[]): Promise<void>;
  countEvents(): Promise<number>;
}

export interface SeedResult {
  inventory: number;
  inserted: string[];
  alreadyPresent: number;
  /** Rows whose slug is not in the frozen inventory (never shown on the site). */
  unknownSlugs: string[];
  totalRows: number;
}

/** Seed rows for every inventory event, in inventory order. Throws on invalid repository data. */
export function buildSeedPlan() {
  return eventInventory.map((identity) =>
    identityToSeedRows(identity, eventDetails[identity.slug]),
  );
}

export async function runSeed(store: SeedStore): Promise<SeedResult> {
  const plan = buildSeedPlan();
  const existing = await store.existingSlugs();
  const missing = plan.filter((rows) => !existing.has(rows.event.event_slug));

  if (missing.length) {
    await store.insertEvents(missing.map((rows) => rows.event));
    const coordinators = missing.flatMap((rows) => rows.coordinators);
    if (coordinators.length) await store.insertCoordinators(coordinators);
  }

  const known = new Set<string>(eventInventory.map((e) => e.slug));
  return {
    inventory: plan.length,
    inserted: missing.map((rows) => rows.event.event_slug),
    alreadyPresent: plan.length - missing.length,
    unknownSlugs: [...existing].filter((slug) => !known.has(slug)).sort(),
    totalRows: await store.countEvents(),
  };
}

/** SeedStore on Supabase (service role). Used by scripts/cms-seed.mts. */
export function supabaseSeedStore(client: SupabaseClient): SeedStore {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`CMS seed: ${what} failed — ${error.message}`);
  };
  return {
    async existingSlugs() {
      const { data, error } = await client.from(CMS_TABLES.events).select("event_slug");
      fail("reading existing rows", error);
      return new Set((data ?? []).map((row: { event_slug: string }) => row.event_slug));
    },
    async insertEvents(rows) {
      // ignoreDuplicates: a row created concurrently is left untouched (ON CONFLICT DO NOTHING).
      const { error } = await client
        .from(CMS_TABLES.events)
        .upsert(rows, { onConflict: "event_slug", ignoreDuplicates: true });
      fail("inserting events", error);
    },
    async insertCoordinators(rows) {
      const { error } = await client.from(CMS_TABLES.coordinators).insert(rows);
      fail("inserting coordinators", error);
    },
    async countEvents() {
      const { count, error } = await client
        .from(CMS_TABLES.events)
        .select("event_slug", { count: "exact", head: true });
      fail("counting rows", error);
      return count ?? 0;
    },
  };
}
