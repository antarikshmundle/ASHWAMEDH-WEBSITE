import { contact, culturalNight, scheduleRows, socialLinks } from "@/data/festival";
import { verticals } from "@/data/verticals";
import type { Vertical } from "@/types/festival";

/**
 * Festival-level content the CMS can edit (Phase 10.5). The repository values in src/data are the
 * defaults (repository mode, or before anything is saved); unknown = `null` everywhere.
 */

export type ScheduleKey = (typeof scheduleRows)[number]["key"];

export interface FestivalSettings {
  contact: { phone: string | null; whatsapp: string | null; email: string | null };
  socialLinks: readonly { label: string; href: string }[];
  /** Day 1 and Day 2 of Cultural Night. */
  culturalNightDates: readonly [string | null, string | null];
  /** Time and venue of each fixed schedule row (titles stay in the repository). */
  schedule: Readonly<Record<ScheduleKey, { time: string | null; venue: string | null }>>;
  taglines: Readonly<Record<Vertical, string | null>>;
}

export const repositorySettings: FestivalSettings = {
  contact: { ...contact },
  socialLinks,
  culturalNightDates: [culturalNight.nights[0]!.date, culturalNight.nights[1]!.date],
  schedule: Object.fromEntries(
    scheduleRows.map((row) => [row.key, { time: row.time, venue: row.venue }]),
  ) as FestivalSettings["schedule"],
  taglines: Object.fromEntries(verticals.map((v) => [v.id, v.tagline])) as Record<
    Vertical,
    string | null
  >,
};
