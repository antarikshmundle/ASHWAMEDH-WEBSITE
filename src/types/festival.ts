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
 * Registration lifecycle. Exact values may be refined in Phase 6;
 * until official forms exist every event is "not-open".
 */
export type RegistrationStatus = "not-open" | "open" | "closed";

export interface Coordinator {
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * Event data model (master prompt §11). Every unknown official value is `null` —
 * never a placeholder string. Display wording for nulls lives in src/lib/display.ts.
 */
export interface FestEvent {
  /** URL slug — derived from the official name. */
  id: string;
  name: string;
  category: EventVertical;
  /** `null` for Sports (not department events). */
  department: Department | null;
  description: string | null;
  image: string | null;
  rules: string[] | null;
  eligibility: string | null;
  /** Free-form official wording, e.g. "2–4 members". */
  teamSize: string | null;
  registrationFee: string | null;
  prize: string | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  coordinator: Coordinator[] | null;
  registrationDeadline: string | null;
  /** Official Google Form URL. */
  registrationLink: string | null;
  /** Official event PDF path or URL. */
  pdf: string | null;
  status: RegistrationStatus;
}
