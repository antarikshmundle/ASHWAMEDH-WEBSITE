import { contactHref } from "@/lib/contact";
import {
  repositorySettings,
  type FestivalSettings,
  type ScheduleKey,
} from "@/lib/festival-settings";
import type { ContentSource, Vertical } from "@/types/festival";
import { isPastOrToday, type FieldErrors } from "./event-form";

/**
 * Festival settings (Phase 10.5): the festival_settings row ⇄ domain ⇄ admin form. Pure — no I/O.
 * The same rules as the public site (contact.ts; https-only social links); the database repeats
 * them. Empty = NULL (TBA / nothing shown); any value needs the official source.
 */

export const SCHEDULE_KEYS = [
  "inauguration",
  "technomedh",
  "cultural",
  "sports",
  "cultural-night",
] as const satisfies readonly ScheduleKey[];
export const TAGLINE_KEYS = [
  "technomedh",
  "cultural",
  "sports",
  "cultural-night",
] as const satisfies readonly Vertical[];
export const SETTINGS_LIMITS = {
  date: 60,
  time: 60,
  venue: 120,
  tagline: 120,
  label: 40,
  href: 300,
  links: 8,
  reference: 200,
} as const;
const col = (key: string) => key.replace(/-/g, "_");

/** festival_settings — one row (id = 1). */
export interface FestivalSettingsRow {
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  social_links: { label: string; href: string }[];
  cultural_night_day1_date: string | null;
  cultural_night_day2_date: string | null;
  [column: `schedule_${string}_${"time" | "venue"}` | `tagline_${string}`]: string | null;
  source_kind: ContentSource["kind"] | null;
  source_reference: string | null;
  source_date: string | null;
}
/** The payload for cms_save_settings: every editable column (missing = NULL). */
export type SettingsPayload = Omit<FestivalSettingsRow, never>;

export function rowToSettings(row: FestivalSettingsRow | null): FestivalSettings {
  if (!row) return repositorySettings;
  return {
    contact: { phone: row.contact_phone, whatsapp: row.contact_whatsapp, email: row.contact_email },
    socialLinks: (row.social_links ?? []).filter((l) => l.href.startsWith("https://")),
    culturalNightDates: [row.cultural_night_day1_date, row.cultural_night_day2_date],
    schedule: Object.fromEntries(
      SCHEDULE_KEYS.map((k) => [
        k,
        {
          time: row[`schedule_${col(k)}_time`] ?? null,
          venue: row[`schedule_${col(k)}_venue`] ?? null,
        },
      ]),
    ) as FestivalSettings["schedule"],
    taglines: Object.fromEntries(
      TAGLINE_KEYS.map((k) => [k, row[`tagline_${col(k)}`] ?? null]),
    ) as FestivalSettings["taglines"],
  };
}

/* ---------- admin form ---------- */

export interface SettingsFormValues {
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  socialLinks: { label: string; href: string }[];
  culturalNightDay1: string;
  culturalNightDay2: string;
  schedule: Record<ScheduleKey, { time: string; venue: string }>;
  taglines: Record<(typeof TAGLINE_KEYS)[number], string>;
  sourceKind: string;
  sourceReference: string;
  sourceDate: string;
}

export function rowToFormValues(row: FestivalSettingsRow | null): SettingsFormValues {
  const s = rowToSettings(row);
  return {
    contactPhone: s.contact.phone ?? "",
    contactWhatsapp: s.contact.whatsapp ?? "",
    contactEmail: s.contact.email ?? "",
    socialLinks: s.socialLinks.map((l) => ({ ...l })),
    culturalNightDay1: s.culturalNightDates[0] ?? "",
    culturalNightDay2: s.culturalNightDates[1] ?? "",
    schedule: Object.fromEntries(
      SCHEDULE_KEYS.map((k) => [
        k,
        { time: s.schedule[k].time ?? "", venue: s.schedule[k].venue ?? "" },
      ]),
    ) as SettingsFormValues["schedule"],
    taglines: Object.fromEntries(
      TAGLINE_KEYS.map((k) => [k, s.taglines[k] ?? ""]),
    ) as SettingsFormValues["taglines"],
    sourceKind: row?.source_kind ?? "",
    sourceReference: row?.source_reference ?? "",
    sourceDate: row?.source_date ?? "",
  };
}

const str = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

export function parseSettingsForm(data: FormData): SettingsFormValues {
  const labels = data.getAll("socialLabel").map(String);
  const hrefs = data.getAll("socialHref").map(String);
  return {
    contactPhone: str(data, "contactPhone"),
    contactWhatsapp: str(data, "contactWhatsapp"),
    contactEmail: str(data, "contactEmail"),
    socialLinks: labels.map((label, i) => ({ label, href: hrefs[i] ?? "" })),
    culturalNightDay1: str(data, "culturalNightDay1"),
    culturalNightDay2: str(data, "culturalNightDay2"),
    schedule: Object.fromEntries(
      SCHEDULE_KEYS.map((k) => [
        k,
        { time: str(data, `schedule.${k}.time`), venue: str(data, `schedule.${k}.venue`) },
      ]),
    ) as SettingsFormValues["schedule"],
    taglines: Object.fromEntries(
      TAGLINE_KEYS.map((k) => [k, str(data, `tagline.${k}`)]),
    ) as SettingsFormValues["taglines"],
    sourceKind: str(data, "sourceKind"),
    sourceReference: str(data, "sourceReference"),
    sourceDate: str(data, "sourceDate"),
  };
}

const clean = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim();
const SOURCE_KINDS: readonly string[] = ["official-pdf", "official-form", "owner-confirmed"];

/** An https link to a real host, without credentials. */
export function safeSocialHref(value: string): string | null {
  if (!/^https:\/\//i.test(value) || value.length > SETTINGS_LIMITS.href || /\s/.test(value))
    return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes("."))
      return null;
    return /^https:\/\/[^\s/?#@]+\.[^\s/?#@]+(\/[^\s]*)?$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export type SettingsFormResult =
  { ok: true; payload: SettingsPayload } | { ok: false; errors: FieldErrors };

export function validateSettingsForm(
  values: SettingsFormValues,
  today = new Date(),
): SettingsFormResult {
  const errors: FieldErrors = {};
  const text = (key: string, value: string, max: number) => {
    const v = clean(value);
    if (v.length > max) errors[key] = `At most ${max} characters.`;
    return v || null;
  };

  const phone = text("contactPhone", values.contactPhone, 30);
  if (phone && !contactHref("phone", phone))
    errors.contactPhone = "Use digits, optionally starting with +, e.g. +91 98765 43210.";
  const whatsapp = text("contactWhatsapp", values.contactWhatsapp, 30);
  if (whatsapp && !contactHref("whatsapp", whatsapp))
    errors.contactWhatsapp = "Use the international format with +, e.g. +91 98765 43210.";
  const email = text("contactEmail", values.contactEmail, 254);
  if (email && !contactHref("email", email)) errors.contactEmail = "Enter a valid email address.";

  const links: { label: string; href: string }[] = [];
  values.socialLinks.forEach((link, i) => {
    const label = clean(link.label);
    const href = link.href.trim();
    if (!label && !href) return; // empty rows are ignored
    if (!label) errors[`social.${i}.label`] = "Enter a label, e.g. Instagram.";
    else if (label.length > SETTINGS_LIMITS.label)
      errors[`social.${i}.label`] = `At most ${SETTINGS_LIMITS.label} characters.`;
    const safe = safeSocialHref(href);
    if (!safe) errors[`social.${i}.href`] = "Use the official https:// link of the account.";
    if (label && safe) links.push({ label, href: safe });
  });
  if (links.length > SETTINGS_LIMITS.links)
    errors.socialLinks = `At most ${SETTINGS_LIMITS.links} links.`;

  const payload: Record<string, unknown> = {
    contact_phone: phone,
    contact_whatsapp: whatsapp,
    contact_email: email,
    social_links: links,
    cultural_night_day1_date: text(
      "culturalNightDay1",
      values.culturalNightDay1,
      SETTINGS_LIMITS.date,
    ),
    cultural_night_day2_date: text(
      "culturalNightDay2",
      values.culturalNightDay2,
      SETTINGS_LIMITS.date,
    ),
  };
  for (const k of SCHEDULE_KEYS) {
    payload[`schedule_${col(k)}_time`] = text(
      `schedule.${k}.time`,
      values.schedule[k].time,
      SETTINGS_LIMITS.time,
    );
    payload[`schedule_${col(k)}_venue`] = text(
      `schedule.${k}.venue`,
      values.schedule[k].venue,
      SETTINGS_LIMITS.venue,
    );
  }
  for (const k of TAGLINE_KEYS)
    payload[`tagline_${col(k)}`] = text(
      `tagline.${k}`,
      values.taglines[k],
      SETTINGS_LIMITS.tagline,
    );

  const hasContent =
    links.length > 0 ||
    Object.entries(payload).some(([key, v]) => key !== "social_links" && v !== null);
  const kind = clean(values.sourceKind);
  const reference = clean(values.sourceReference);
  const date = values.sourceDate.trim();
  if (kind || reference || date || hasContent) {
    if (!SOURCE_KINDS.includes(kind))
      errors.sourceKind = "Choose where the official information came from.";
    if (!reference)
      errors.sourceReference = "Name the source (file name, form title, or who confirmed it).";
    else if (reference.length > SETTINGS_LIMITS.reference)
      errors.sourceReference = `At most ${SETTINGS_LIMITS.reference} characters.`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
      errors.sourceDate = "Enter the date the information was received.";
    else if (!isPastOrToday(date, today)) errors.sourceDate = "The date cannot be in the future.";
    payload.source_kind = kind || null;
    payload.source_reference = reference || null;
    payload.source_date = date || null;
  } else {
    payload.source_kind = payload.source_reference = payload.source_date = null;
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, payload: payload as SettingsPayload };
}
