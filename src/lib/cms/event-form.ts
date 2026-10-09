import { buildEvent } from "@/data/events/build";
import { contactHref } from "@/lib/contact";
import { pdfHref, registrationHref } from "@/lib/safe-url";
import type {
  ContentSource,
  EventDetailsInput,
  EventIdentity,
  Participation,
  RegistrationStatus,
} from "@/types/festival";
import type { EventContentRecord } from "./schema";

/**
 * Event editor form (Phase 10.3): parsing, validation and the payload for cms_save_event.
 * Pure — no I/O. The rules are the site's own (safe-url.ts, contact.ts, buildEvent()); the
 * database repeats them. Unknown values are saved as NULL and shown as TBA / Coming Soon.
 *
 * Event identity (slug, name, department, vertical) is not part of the form and cannot change.
 * Image and uploaded files are managed in Phase 10.4 and are not edited here.
 */

export const LIMITS = {
  short: 120,
  venue: 200,
  item: 2000,
  items: 30,
  coordinators: 6,
  sourceReference: 200,
  url: 500,
} as const;

const PARTICIPATION: readonly Participation[] = ["individual", "team", "individual-or-team"];
const STATUSES: readonly RegistrationStatus[] = ["not-open", "open", "closed"];
const SOURCE_KINDS: readonly ContentSource["kind"][] = [
  "official-pdf",
  "official-form",
  "owner-confirmed",
];

export interface CoordinatorValues {
  name: string;
  designation: string;
  phone: string;
  email: string;
}

/** Raw form values (strings), as typed. Re-displayed unchanged when validation fails. */
export interface EventFormValues {
  description: string;
  rules: string;
  eligibility: string;
  participation: string;
  teamSize: string;
  registrationFee: string;
  date: string;
  time: string;
  venue: string;
  guidelinesUrl: string;
  registrationStatus: string;
  registrationUrl: string;
  registrationDeadline: string;
  sourceKind: string;
  sourceReference: string;
  sourceDate: string;
  coordinators: CoordinatorValues[];
}

/** Field errors keyed by field name; coordinator fields as `coordinators.<i>.<field>`. */
export type FieldErrors = Record<string, string>;

/** The editable events_content columns, exactly as cms_save_event expects them. */
export interface EventContentPayload {
  description: string[] | null;
  rules: string[] | null;
  eligibility: string[] | null;
  participation: Participation | null;
  team_size: string | null;
  registration_fee: string | null;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  guidelines_url: string | null;
  registration_status: RegistrationStatus;
  registration_url: string | null;
  registration_deadline: string | null;
  source_kind: ContentSource["kind"] | null;
  source_reference: string | null;
  source_date: string | null;
}

export interface CoordinatorPayload {
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
}

export type EventFormResult =
  | { ok: true; content: EventContentPayload; coordinators: CoordinatorPayload[] }
  | { ok: false; errors: FieldErrors };

/* ---------- parsing ---------- */

const str = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};
const all = (data: FormData, name: string) =>
  data.getAll(name).map((v) => (typeof v === "string" ? v : ""));

export function parseEventForm(data: FormData): EventFormValues {
  const names = all(data, "coordinatorName");
  const designations = all(data, "coordinatorDesignation");
  const phones = all(data, "coordinatorPhone");
  const emails = all(data, "coordinatorEmail");
  return {
    description: str(data, "description"),
    rules: str(data, "rules"),
    eligibility: str(data, "eligibility"),
    participation: str(data, "participation"),
    teamSize: str(data, "teamSize"),
    registrationFee: str(data, "registrationFee"),
    date: str(data, "date"),
    time: str(data, "time"),
    venue: str(data, "venue"),
    guidelinesUrl: str(data, "guidelinesUrl"),
    registrationStatus: str(data, "registrationStatus") || "not-open",
    registrationUrl: str(data, "registrationUrl"),
    registrationDeadline: str(data, "registrationDeadline"),
    sourceKind: str(data, "sourceKind"),
    sourceReference: str(data, "sourceReference"),
    sourceDate: str(data, "sourceDate"),
    coordinators: names.map((name, i) => ({
      name,
      designation: designations[i] ?? "",
      phone: phones[i] ?? "",
      email: emails[i] ?? "",
    })),
  };
}

/** Form values for a stored row (missing row = everything empty, not open). */
export function recordToFormValues(record: EventContentRecord | null): EventFormValues {
  const paragraphs = (items: string[] | null) => (items ?? []).join("\n\n");
  return {
    description: paragraphs(record?.description ?? null),
    rules: (record?.rules ?? []).join("\n"),
    eligibility: paragraphs(record?.eligibility ?? null),
    participation: record?.participation ?? "",
    teamSize: record?.team_size ?? "",
    registrationFee: record?.registration_fee ?? "",
    date: record?.event_date ?? "",
    time: record?.event_time ?? "",
    venue: record?.venue ?? "",
    guidelinesUrl: record?.guidelines_url ?? "",
    registrationStatus: record?.registration_status ?? "not-open",
    registrationUrl: record?.registration_url ?? "",
    registrationDeadline: record?.registration_deadline ?? "",
    sourceKind: record?.source_kind ?? "",
    sourceReference: record?.source_reference ?? "",
    sourceDate: record?.source_date ?? "",
    coordinators: [...(record?.event_coordinators ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        name: c.name,
        designation: c.designation ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
      })),
  };
}

/* ---------- validation ---------- */

const clean = (value: string) =>
  value
    .normalize("NFC")
    .trim()
    .replace(/[ \t]+/g, " ");
const orNull = (value: string) => clean(value) || null;
/** Paragraphs separated by blank lines (description, eligibility). */
const paragraphs = (value: string) =>
  value
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.split(/\r?\n/).map(clean).join(" ").trim())
    .filter(Boolean);
/** One item per line (rules). */
const lines = (value: string) => value.split(/\r?\n/).map(clean).filter(Boolean);

function isPastOrToday(isoDate: string, today: Date): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return false;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return false;
  // One day of slack for time zones (IST is ahead of UTC).
  return date.getTime() <= today.getTime() + 24 * 60 * 60 * 1000;
}

/**
 * Validates the form for one frozen event. `hasManagedFiles` is true when the event already has an
 * image or an uploaded file (Phase 10.4 fields), which also counts as content needing a source.
 */
export function validateEventForm(
  identity: EventIdentity,
  values: EventFormValues,
  options: { hasManagedFiles?: boolean; today?: Date } = {},
): EventFormResult {
  const errors: FieldErrors = {};
  const today = options.today ?? new Date();

  const short = (field: keyof EventFormValues, limit: number = LIMITS.short) => {
    const value = orNull(values[field] as string);
    if (value && value.length > limit) errors[field] = `Use at most ${limit} characters.`;
    return value;
  };
  const list = (field: "description" | "rules" | "eligibility", items: string[]) => {
    if (items.length > LIMITS.items) errors[field] = `Use at most ${LIMITS.items} entries.`;
    else if (items.some((item) => item.length > LIMITS.item))
      errors[field] = `Each entry can be at most ${LIMITS.item} characters.`;
    return items.length ? items : null;
  };

  const description = list("description", paragraphs(values.description));
  const rules = list("rules", lines(values.rules));
  const eligibility = list("eligibility", paragraphs(values.eligibility));

  const participationRaw = clean(values.participation);
  let participation: Participation | null = null;
  if (participationRaw) {
    if ((PARTICIPATION as readonly string[]).includes(participationRaw))
      participation = participationRaw as Participation;
    else errors.participation = "Choose a participation type, or leave it as TBA.";
  }

  const teamSize = short("teamSize");
  const registrationFee = short("registrationFee");
  const date = short("date");
  const time = short("time");
  const venue = short("venue", LIMITS.venue);
  const registrationDeadline = short("registrationDeadline");

  const guidelinesRaw = orNull(values.guidelinesUrl);
  let guidelinesUrl: string | null = null;
  if (guidelinesRaw) {
    guidelinesUrl = guidelinesRaw.length <= LIMITS.url ? pdfHref(guidelinesRaw) : null;
    if (!guidelinesUrl)
      errors.guidelinesUrl = "Use an https:// link or a /docs/… path to the official PDF.";
  }

  const statusRaw = clean(values.registrationStatus) || "not-open";
  const status = (STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as RegistrationStatus)
    : null;
  if (!status) errors.registrationStatus = "Choose a registration status.";

  const registrationRaw = orNull(values.registrationUrl);
  let registrationUrl: string | null = null;
  if (registrationRaw) {
    registrationUrl =
      registrationRaw.length <= LIMITS.url ? registrationHref(registrationRaw) : null;
    if (!registrationUrl)
      errors.registrationUrl =
        "Use the official Google Form link (https://docs.google.com/forms/… or https://forms.gle/…).";
  }
  if (status === "open" && !registrationUrl && !errors.registrationUrl) {
    errors.registrationStatus = "Registration can only be open with an official Google Form link.";
  }

  // Error keys use the row's position in the form; empty rows are dropped silently.
  const coordinators: CoordinatorPayload[] = [];
  let filledRows = 0;
  values.coordinators.forEach((c, i) => {
    if (!(clean(c.name) || clean(c.designation) || clean(c.phone) || clean(c.email))) return;
    if (++filledRows > LIMITS.coordinators) {
      errors.coordinators = `Add at most ${LIMITS.coordinators} coordinators.`;
      return;
    }
    const key = (field: string) => `coordinators.${i}.${field}`;
    const name = orNull(c.name);
    const designation = orNull(c.designation);
    const phone = orNull(c.phone);
    const email = orNull(c.email);
    if (!name) errors[key("name")] = "Enter the coordinator's name, or clear this row.";
    else if (name.length > LIMITS.short)
      errors[key("name")] = `Use at most ${LIMITS.short} characters.`;
    if (designation && designation.length > LIMITS.short)
      errors[key("designation")] = `Use at most ${LIMITS.short} characters.`;
    if (phone && !contactHref("phone", phone))
      errors[key("phone")] = "Enter a phone number, e.g. +91 98765 43210.";
    if (email && !contactHref("email", email))
      errors[key("email")] = "Enter a valid email address.";
    if (name)
      coordinators.push({ name, designation, phone, email, sort_order: coordinators.length });
  });

  const hasContent =
    Boolean(description || rules || eligibility || participation || teamSize || registrationFee) ||
    Boolean(date || time || venue || guidelinesUrl || registrationUrl || registrationDeadline) ||
    status !== "not-open" ||
    coordinators.length > 0 ||
    Boolean(options.hasManagedFiles);

  const sourceKindRaw = clean(values.sourceKind);
  const sourceReference = orNull(values.sourceReference);
  const sourceDate = orNull(values.sourceDate);
  const anySource = Boolean(sourceKindRaw || sourceReference || sourceDate);
  let source: ContentSource | null = null;
  if (hasContent || anySource) {
    if (!(SOURCE_KINDS as readonly string[]).includes(sourceKindRaw))
      errors.sourceKind = "Choose where this information comes from.";
    if (!sourceReference) errors.sourceReference = "Name the official document, form or person.";
    else if (sourceReference.length > LIMITS.sourceReference)
      errors.sourceReference = `Use at most ${LIMITS.sourceReference} characters.`;
    if (!sourceDate || !isPastOrToday(sourceDate, today))
      errors.sourceDate = "Enter the date the information was received (not in the future).";
    if (!errors.sourceKind && !errors.sourceReference && !errors.sourceDate) {
      source = {
        kind: sourceKindRaw as ContentSource["kind"],
        reference: sourceReference!,
        date: sourceDate!,
      };
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const content: EventContentPayload = {
    description,
    rules,
    eligibility,
    participation,
    team_size: teamSize,
    registration_fee: registrationFee,
    event_date: date,
    event_time: time,
    venue,
    guidelines_url: guidelinesUrl,
    registration_status: status!,
    registration_url: registrationUrl,
    registration_deadline: registrationDeadline,
    source_kind: source?.kind ?? null,
    source_reference: source?.reference ?? null,
    source_date: source?.date ?? null,
  };

  // Final guard: the public site's own builder must accept exactly what will be stored.
  if (source) {
    const details: EventDetailsInput = {
      source,
      description: description ?? undefined,
      rules: rules ?? undefined,
      eligibility: eligibility ?? undefined,
      participation: participation ?? undefined,
      teamSize: teamSize ?? undefined,
      registrationFee: registrationFee ?? undefined,
      date: date ?? undefined,
      time: time ?? undefined,
      venue: venue ?? undefined,
      pdf: guidelinesUrl ?? undefined,
      registrationLink: registrationUrl ?? undefined,
      registrationDeadline: registrationDeadline ?? undefined,
      status: status!,
      coordinators: coordinators.map(({ name, designation, phone, email }) => ({
        name,
        designation,
        phone,
        email,
      })),
    };
    try {
      buildEvent(identity, details);
    } catch (error) {
      return { ok: false, errors: { form: (error as Error).message } };
    }
  }
  return { ok: true, content, coordinators };
}
