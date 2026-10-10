import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CmsUnavailable, PublishingNotice } from "@/components/admin/cms-notices";
import { EventEditor } from "@/components/admin/event-editor";
import { getVertical } from "@/data/verticals";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getEventForEdit,
  inventoryEvent,
  listRevisions,
  mediaSummary,
  type EventForEdit,
  type RevisionSummary,
} from "@/lib/cms/admin-events";
import { requireSupabaseCredentials } from "@/lib/cms/config";
import { LIMITS, recordToFormValues } from "@/lib/cms/event-form";
import { FILE_RULES } from "@/lib/cms/upload-policy";

const MEDIA_LIMITS = {
  image: {
    maxBytes: FILE_RULES["event-image"].maxBytes,
    types: [...FILE_RULES["event-image"].types],
  },
  guidelines: { maxBytes: FILE_RULES.document.maxBytes, types: [...FILE_RULES.document.types] },
};

export async function generateMetadata({
  params,
}: PageProps<"/admin/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: inventoryEvent(slug)?.name ?? "Event" };
}

/**
 * Event editor (Phase 10.3; event files since 10.4.5). Identity is read-only; only official
 * content is editable.
 */
export default async function EditEventPage({ params }: PageProps<"/admin/events/[slug]">) {
  await requireAdmin();
  const { slug } = await params;
  const identity = inventoryEvent(slug);
  if (!identity) notFound();

  let data: EventForEdit | undefined;
  let revisions: RevisionSummary[] = [];
  let failure: string | undefined;
  try {
    data = await getEventForEdit(slug);
    revisions = await listRevisions(slug);
  } catch (error) {
    failure = (error as Error).name === "CmsConfigError" ? (error as Error).message : undefined;
    console.error(`[cms] loading editor for "${slug}" failed: ${(error as Error).message}`);
  }

  const record = data?.record ?? null;
  return (
    <div>
      <Link
        href="/admin/events"
        className="inline-flex min-h-11 items-center type-meta text-fg-secondary hover:text-fg"
      >
        ← All events
      </Link>
      <h1 className="mt-2 type-h2 text-fg">{identity.name}</h1>
      <dl className="mt-3 grid gap-x-6 gap-y-1 type-body-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-fg-muted">Vertical</dt>
        <dd className="text-fg">{getVertical(identity.category).shortName}</dd>
        <dt className="text-fg-muted">Department</dt>
        <dd className="text-fg">{identity.department ?? "— (sports event)"}</dd>
        <dt className="text-fg-muted">Public page</dt>
        <dd>
          <a
            href={`/events/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg underline underline-offset-4"
          >
            /events/{slug}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </dd>
      </dl>
      <p className="mt-2 type-meta text-fg-muted">
        Name, department and vertical are fixed by the official event list and cannot be edited.
      </p>
      <PublishingNotice />

      {!data && <CmsUnavailable detail={failure} />}
      {data && !record && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-accent bg-surface-2 px-4 py-3 type-body-sm text-fg"
        >
          This event has no CMS record yet. Run <code>npm run cms:seed</code>, then reload.
        </p>
      )}
      {record && (
        <EventEditor
          slug={slug}
          publicHref={`/events/${slug}`}
          values={recordToFormValues(record)}
          version={record.updated_at}
          revisions={revisions}
          media={mediaSummary(record, requireSupabaseCredentials().url)}
          mediaLimits={MEDIA_LIMITS}
          limits={LIMITS}
        />
      )}
    </div>
  );
}
