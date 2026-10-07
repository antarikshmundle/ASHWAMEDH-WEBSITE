import type { EventDetailsInput } from "@/types/festival";
import type { EventSlug } from "./inventory";

/**
 * Official event details, keyed by slug. Empty until official PDFs/forms are released.
 *
 * Add an entry only with content from an official source, and record that source:
 *
 *   hackathon: {
 *     source: { kind: "official-pdf", reference: "IT_Hackathon_2026.pdf", date: "2026-11-02" },
 *     teamSize: "2–4 members",
 *     participation: "team",
 *   },
 *
 * Omit anything the source does not state — it renders as TBA / Coming Soon.
 */
export const eventDetails: Partial<Record<EventSlug, EventDetailsInput>> = {};
