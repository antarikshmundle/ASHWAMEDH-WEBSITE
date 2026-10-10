import { buildEvent } from "@/data/events/build";
import type { Coordinator, EventDetailsInput, EventIdentity } from "@/types/festival";
import { publicFileUrl } from "./client";
import {
  BUCKETS,
  type CoordinatorRow,
  type EventContentRecord,
  type EventContentRow,
} from "./schema";

/**
 * Database rows ⇄ domain details (Phase 10.2). The domain layer (buildEvent) stays the single
 * place that validates and normalises content; these functions only translate shapes.
 */

const some = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

const UUID_NAME = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * A linked file only when it is exactly what the media service stores for this event: the right
 * bucket and `events/<slug>/<uuid>.<ext>` (the database enforces the same). Anything else is
 * ignored, so the page falls back to its abstract art / "Coming Soon" instead of a wrong file.
 */
function storedFile(
  slug: string,
  file: EventContentRecord["image_file"],
  bucket: string,
  extensions: string,
) {
  if (!file) return undefined;
  const expected = new RegExp(`^events/${slug}/${UUID_NAME}\\.(${extensions})$`);
  if (file.bucket === bucket && expected.test(file.path)) return file;
  console.warn(`[cms] ignoring an unexpected file reference for "${slug}"`);
  return undefined;
}

/**
 * A content row as `EventDetailsInput`, or `undefined` when the row holds no content yet
 * (→ every field TBA, exactly like an event without a details entry). Content without a source
 * is refused — the database forbids it too.
 */
export function recordToDetails(
  record: EventContentRecord,
  projectUrl: string,
): EventDetailsInput | undefined {
  const coordinators: Coordinator[] = [...(record.event_coordinators ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ name, designation, phone, email }) => ({ name, designation, phone, email }));
  const slug = record.event_slug;
  const imageFile = storedFile(slug, record.image_file, BUCKETS.images, "jpg|png|webp");
  const guidelinesFile = storedFile(slug, record.guidelines_file, BUCKETS.documents, "pdf");
  const fileUrl = (file: EventContentRecord["image_file"] | undefined) =>
    file ? publicFileUrl(projectUrl, file.bucket, file.path) : undefined;

  const details: Omit<EventDetailsInput, "source"> = {
    description: some(record.description),
    rules: some(record.rules),
    eligibility: some(record.eligibility),
    participation: some(record.participation),
    teamSize: some(record.team_size),
    registrationFee: some(record.registration_fee),
    date: some(record.event_date),
    time: some(record.event_time),
    venue: some(record.venue),
    image: fileUrl(imageFile) ?? some(record.image_path),
    // Alt text belongs to an uploaded image; repository paths have none (decorative).
    imageAlt: imageFile ? some(imageFile.alt_text) : undefined,
    pdf: fileUrl(guidelinesFile) ?? some(record.guidelines_url),
    registrationLink: some(record.registration_url),
    registrationDeadline: some(record.registration_deadline),
    status: record.registration_status === "not-open" ? undefined : record.registration_status,
    coordinators: coordinators.length ? coordinators : undefined,
  };

  const { source_kind: kind, source_reference: reference, source_date: date } = record;
  if (!kind || !reference || !date) {
    const hasContent = Object.values(details).some((value) => value !== undefined);
    if (hasContent) {
      throw new Error(`CMS content for "${record.event_slug}" has no source (ContentSource).`);
    }
    return undefined;
  }
  return { source: { kind, reference, date }, ...details };
}

/**
 * Seed rows for one frozen event from its repository details (src/data/events/details.ts).
 * The details go through buildEvent() first, so invalid repository data cannot be seeded.
 */
export function identityToSeedRows(
  identity: EventIdentity,
  details: EventDetailsInput | undefined,
): { event: EventContentRow; coordinators: CoordinatorRow[] } {
  const record = buildEvent(identity, details);
  const slug = identity.slug;
  const event: EventContentRow = {
    event_slug: slug,
    description: record.description,
    rules: record.rules,
    eligibility: record.eligibility,
    participation: record.participation,
    team_size: record.teamSize,
    registration_fee: record.registrationFee,
    event_date: record.date,
    event_time: record.time,
    venue: record.venue,
    image_file_id: null,
    image_path: record.image,
    guidelines_file_id: null,
    guidelines_url: record.pdf,
    registration_status: record.status,
    registration_url: record.registrationLink,
    registration_deadline: record.registrationDeadline,
    source_kind: details?.source.kind ?? null,
    source_reference: details?.source.reference.trim() ?? null,
    source_date: details?.source.date ?? null,
  };
  const coordinators: CoordinatorRow[] = (record.coordinators ?? []).map((c, i) => ({
    event_slug: slug,
    name: c.name,
    designation: c.designation ?? null,
    phone: c.phone,
    email: c.email,
    sort_order: i,
  }));
  return { event, coordinators };
}
