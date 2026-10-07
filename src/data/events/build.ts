import type {
  ContentSource,
  Coordinator,
  EventDetailsInput,
  EventIdentity,
  EventRecord,
} from "@/types/festival";

const SOURCE_KINDS: readonly ContentSource["kind"][] = [
  "official-pdf",
  "official-form",
  "owner-confirmed",
];

/** A trimmed value, or `null` when missing or blank. */
function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Trimmed, non-blank items, or `null` when none remain. */
function list(values: readonly string[] | undefined): string[] | null {
  const items = (values ?? []).map((v) => v.trim()).filter(Boolean);
  return items.length ? items : null;
}

function coordinatorList(values: readonly Coordinator[] | undefined): Coordinator[] | null {
  const items = (values ?? []).flatMap((c) => {
    const name = text(c.name);
    return name
      ? [{ name, phone: text(c.phone ?? undefined), email: text(c.email ?? undefined) }]
      : [];
  });
  return items.length ? items : null;
}

/** Every details entry must say where its content came from ("never invent" guard). */
function assertSource(slug: string, source: ContentSource | undefined): void {
  const valid =
    !!source &&
    SOURCE_KINDS.includes(source.kind) &&
    !!text(source.reference) &&
    /^\d{4}-\d{2}-\d{2}$/.test(source.date);
  if (!valid) {
    throw new Error(
      `Event details for "${slug}" need a source: { kind, reference, date: "YYYY-MM-DD" }.`,
    );
  }
}

/**
 * Resolves one event: frozen identity + its official details (if any).
 * Pure — it never adds content. Omitted or blank values become `null`; registration
 * fields (Phase 7) pass through unchanged, and registration stays "not-open" by default.
 */
export function buildEvent(identity: EventIdentity, details?: EventDetailsInput): EventRecord {
  if (details) assertSource(identity.slug, details.source);
  const d: Partial<EventDetailsInput> = details ?? {};

  return {
    slug: identity.slug,
    name: identity.name,
    category: identity.category,
    department: identity.department,
    description: list(d.description),
    image: text(d.image),
    rules: list(d.rules),
    eligibility: list(d.eligibility),
    participation: d.participation ?? null,
    teamSize: text(d.teamSize),
    registrationFee: text(d.registrationFee),
    prizePool: text(d.prizePool),
    prizeDetails: list(d.prizeDetails),
    date: text(d.date),
    time: text(d.time),
    venue: text(d.venue),
    coordinators: coordinatorList(d.coordinators),
    pdf: text(d.pdf),
    registrationLink: d.registrationLink ?? null,
    registrationDeadline: d.registrationDeadline ?? null,
    status: d.status ?? "not-open",
  };
}
