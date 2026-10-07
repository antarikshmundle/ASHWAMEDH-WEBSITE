/** Event verticals that have event listings. Cultural Night is a showcase, not a listing (OD-14). */
export type EventVertical = "technomedh" | "cultural" | "sports";

/** All four festival verticals (used for theming and the overview cards). */
export type Vertical = EventVertical | "cultural-night";

export type Department =
  | "Mechanical Engineering"
  | "Aeronautical Engineering"
  | "Chemical Engineering"
  | "Biotechnology"
  | "Electrical Engineering / E&P"
  | "Civil Engineering"
  | "Computer Technology"
  | "Computer Science Engineering"
  | "Information Technology"
  | "Electronics and Telecommunication"
  | "Electronics and Communication"
  | "Industrial IOT"
  | "Robotics and AI"
  | "First Year"
  | "AI & DS";

/**
 * Frozen official identity of an event (master prompt §6; names per OD-01/OD-02).
 * The slug is explicit — never derived at runtime — so a public URL cannot change by accident.
 */
export interface EventIdentity {
  /** Permanent URL slug (docs/ux/sitemap-and-routes.md §3). */
  slug: string;
  name: string;
  category: EventVertical;
  /** `null` for Sports (not department events). */
  department: Department | null;
  /**
   * Former slugs of this event after an official rename; each permanently redirects to `slug`
   * (docs/ux/sitemap-and-routes.md §3). Only real former URLs belong here.
   */
  legacySlugs?: readonly string[];
}

/**
 * Registration lifecycle. Exact values may be refined in Phase 6;
 * until official forms exist every event is "not-open".
 */
export type RegistrationStatus = "not-open" | "open" | "closed";

export interface Coordinator {
  name: string;
  phone: string | null;
  email: string | null;
}

/** How an event is entered: one person, a team, or either (stated by the official source). */
export type Participation = "individual" | "team" | "individual-or-team";

/** Where official event details came from. Required for every details entry — never invent. */
export interface ContentSource {
  kind: "official-pdf" | "official-form" | "owner-confirmed";
  /** PDF file name, form title, or who confirmed it. */
  reference: string;
  /** Date the content was entered, as YYYY-MM-DD. */
  date: string;
}

/**
 * Official details for one event, exactly as its official source states them.
 * Anything the source does not state is omitted (→ `null`), never guessed.
 */
export interface EventDetailsInput {
  source: ContentSource;
  /** About tab, one string per paragraph. */
  description?: readonly string[];
  /** Path under /images/events/ (src/lib/media.ts). */
  image?: string;
  rules?: readonly string[];
  /** Eligibility tab, one string per paragraph. */
  eligibility?: readonly string[];
  participation?: Participation;
  /** Official wording for the "Team Size" chip, e.g. "2–4 members". */
  teamSize?: string;
  registrationFee?: string;
  /** "Prize Pool" chip — a short value, e.g. "₹10,000". */
  prizePool?: string;
  /** Prizes tab — the full breakdown, one line each. */
  prizeDetails?: readonly string[];
  date?: string;
  time?: string;
  venue?: string;
  coordinators?: readonly Coordinator[];
  /** Official event PDF path or URL. */
  pdf?: string;
  /** Phase 7 — passed through unchanged. */
  registrationLink?: string;
  /** Phase 7 — passed through unchanged. */
  registrationDeadline?: string;
  /** Phase 7 — passed through unchanged. */
  status?: RegistrationStatus;
}

/**
 * Event data model (master prompt §11, Phase 6): frozen identity + official details.
 * Every unknown is `null` — never a placeholder string. Display wording for nulls lives in
 * src/lib/display.ts.
 */
export interface EventRecord extends Omit<EventIdentity, "legacySlugs"> {
  description: string[] | null;
  image: string | null;
  rules: string[] | null;
  eligibility: string[] | null;
  participation: Participation | null;
  teamSize: string | null;
  registrationFee: string | null;
  prizePool: string | null;
  prizeDetails: string[] | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  coordinators: Coordinator[] | null;
  pdf: string | null;
  registrationLink: string | null;
  registrationDeadline: string | null;
  status: RegistrationStatus;
}
