import { pdfHref, registrationHref } from "@/lib/safe-url";
import type { EventRecord, Participation } from "@/types/festival";

/**
 * The only place placeholder wording lives (docs/ux/states-and-ctas.md).
 * TBA → short facts · Coming Soon → content blocks · Registration Opening Soon → registration CTA only.
 */
export const TBA = "TBA";
export const REGISTRATION_OPENING_SOON = "Registration Opening Soon";

/** Shown on event detail while registration is not publicly open (departmental shortlisting). */
export const REGISTRATION_PROCESS =
  "Registration process: participation is subject to departmental shortlisting. Shortlisted students complete the official registration form — contact your department or the event coordinator for details.";

/** Schedule status line; the second part is shown in the brand accent (reference panel 06). */
export const scheduleStatus = { lead: "Schedule", accent: "Releasing Soon" } as const;

/** Content-block placeholders, one sentence each (state table). */
export const placeholders = {
  description: "Details coming soon.",
  rules: "Rules will be published with the official event PDF.",
  eligibility: "Eligibility details coming soon.",
  venue: "Venue will be announced.",
  coordinator: "Coordinator details will be announced.",
  venueMap: "Venue details coming soon.",
  gallery: "Gallery coming soon.",
  team: "Organising committee will be announced.",
} as const;

/** A short factual value, or "TBA". */
export function fact(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : TBA;
}

/** A venue, or "Venue TBA" where the value stands alone without a label (schedule rows). */
export function venueFact(venue: string | null): string {
  const trimmed = venue?.trim();
  return trimmed ? trimmed : `Venue ${TBA}`;
}

/** "Date & Time" chip: one "TBA" when both are unknown. */
export function dateTime(date: string | null, time: string | null): string {
  const parts = [date?.trim(), time?.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : TBA;
}

const participationLabels: Record<Participation, string> = {
  individual: "Individual",
  team: "Team",
  "individual-or-team": "Individual / Team",
};

/** Participation as stated by the official source — never derived from the team size. */
export function participationLabel(participation: Participation | null): string {
  return participation ? participationLabels[participation] : TBA;
}

export type RegistrationState =
  | { kind: "opening-soon"; label: string }
  | { kind: "open"; label: string; href: string }
  | { kind: "closed"; label: string };

/**
 * Primary CTA state (docs/ux/event-discovery.md §8). Open only when the status is "open" and
 * the link is a valid official Google Form (D7-3); anything else shows "Registration Opening Soon"
 * (defensive fallback, D7-2 — buildEvent already rejects such data).
 */
export function registrationState(
  event: Pick<EventRecord, "registrationLink" | "status">,
): RegistrationState {
  if (event.status === "closed") return { kind: "closed", label: "Registration Closed" };
  const href = registrationHref(event.registrationLink);
  if (event.status === "open" && href) {
    return { kind: "open", label: "Register Now", href };
  }
  return { kind: "opening-soon", label: REGISTRATION_OPENING_SOON };
}

export type PdfState = { kind: "available"; href: string } | { kind: "coming-soon"; label: string };

/** Guidelines PDF CTA: available only for a safe PDF link (D7-8); otherwise "Coming Soon". */
export function pdfState(pdf: string | null): PdfState {
  const href = pdfHref(pdf);
  return href
    ? { kind: "available", href }
    : { kind: "coming-soon", label: "Guidelines PDF Coming Soon" };
}
