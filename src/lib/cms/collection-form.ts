import { isPastOrToday, type FieldErrors } from "./event-form";

/**
 * Gallery items and team members (Phase 10.6): validation and payloads. Pure — no I/O. Every
 * item needs its official source; the database repeats these rules. Nothing is invented: empty
 * required fields are errors, never defaults.
 */

export const COLLECTION_LIMITS = {
  caption: 200,
  alt: 300,
  name: 120,
  role: 120,
  group: 80,
  reference: 200,
} as const;
export const STATUSES = ["draft", "published"] as const;
export type ItemStatus = (typeof STATUSES)[number];
const SOURCE_KINDS = ["official-pdf", "official-form", "owner-confirmed"] as const;

export interface SourceValues {
  sourceKind: string;
  sourceReference: string;
  sourceDate: string;
}
export interface SourcePayload {
  source_kind: (typeof SOURCE_KINDS)[number];
  source_reference: string;
  source_date: string;
}

const clean = (value: unknown) =>
  typeof value === "string" ? value.normalize("NFC").replace(/\s+/g, " ").trim() : "";

function required(errors: FieldErrors, key: string, value: unknown, max: number, label: string) {
  const v = clean(value);
  if (!v) errors[key] = `Enter the ${label}.`;
  else if (v.length > max) errors[key] = `At most ${max} characters.`;
  return v;
}

function source(errors: FieldErrors, values: SourceValues, today: Date): SourcePayload {
  const kind = clean(values.sourceKind);
  if (!(SOURCE_KINDS as readonly string[]).includes(kind))
    errors.sourceKind = "Choose where the official information came from.";
  const reference = required(
    errors,
    "sourceReference",
    values.sourceReference,
    COLLECTION_LIMITS.reference,
    "source (file name, form title, or who confirmed it)",
  );
  const date = clean(values.sourceDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    errors.sourceDate = "Enter the date the information was received.";
  else if (!isPastOrToday(date, today)) errors.sourceDate = "The date cannot be in the future.";
  return {
    source_kind: kind as SourcePayload["source_kind"],
    source_reference: reference,
    source_date: date,
  };
}

const status = (errors: FieldErrors, value: unknown): ItemStatus => {
  const v = clean(value) || "draft";
  if (!(STATUSES as readonly string[]).includes(v)) errors.status = "Choose Draft or Published.";
  return v as ItemStatus;
};

type Result<T> = { ok: true; payload: T } | { ok: false; errors: FieldErrors };
const result = <T>(errors: FieldErrors, payload: T): Result<T> =>
  Object.keys(errors).length ? { ok: false, errors } : { ok: true, payload };

/** Alt text: optional (empty = decorative, the caption describes the image), ≤ 300. */
function alt(errors: FieldErrors, value: unknown): string | null {
  const v = clean(value);
  if (v.length > COLLECTION_LIMITS.alt)
    errors.altText = `At most ${COLLECTION_LIMITS.alt} characters.`;
  return v || null;
}

export interface GalleryValues extends SourceValues {
  caption: string;
  altText: string;
  status?: string;
}
export type GalleryPayload = SourcePayload & {
  caption: string;
  status: ItemStatus;
  alt_text: string | null;
};

/**
 * A gallery item. The caption must state what and when — for a previous edition, the edition /
 * year (OD 10.6-3); that is checked by the admin against the official source, not guessed here.
 */
export function validateGalleryItem(
  values: GalleryValues,
  today = new Date(),
): Result<GalleryPayload> {
  const errors: FieldErrors = {};
  const caption = required(errors, "caption", values.caption, COLLECTION_LIMITS.caption, "caption");
  return result(errors, {
    caption,
    alt_text: alt(errors, values.altText),
    status: status(errors, values.status),
    ...source(errors, values, today),
  });
}

export interface TeamValues extends SourceValues {
  name: string;
  role: string;
  groupLabel: string;
  status?: string;
}
export type TeamPayload = SourcePayload & {
  name: string;
  role: string;
  group_label: string;
  status: ItemStatus;
};

export function validateTeamMember(values: TeamValues, today = new Date()): Result<TeamPayload> {
  const errors: FieldErrors = {};
  return result(errors, {
    name: required(errors, "name", values.name, COLLECTION_LIMITS.name, "name"),
    role: required(errors, "role", values.role, COLLECTION_LIMITS.role, "role"),
    group_label: required(
      errors,
      "groupLabel",
      values.groupLabel,
      COLLECTION_LIMITS.group,
      "group",
    ),
    status: status(errors, values.status),
    ...source(errors, values, today),
  });
}

/** Form fields as strings (FormData → values). */
export const formValues = (data: FormData, names: readonly string[]) =>
  Object.fromEntries(
    names.map((n) => [n, typeof data.get(n) === "string" ? (data.get(n) as string) : ""]),
  );
