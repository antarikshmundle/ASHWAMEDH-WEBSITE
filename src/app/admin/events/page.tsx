import type { Metadata } from "next";
import Link from "next/link";
import { CmsUnavailable, formatSavedAt, PublishingNotice } from "@/components/admin/cms-notices";
import { getVertical } from "@/data/verticals";
import { requireAdmin } from "@/lib/admin/auth";
import { listEventsForAdmin, type AdminEventSummary } from "@/lib/cms/admin-events";
import type { EventVertical, RegistrationStatus } from "@/types/festival";

export const metadata: Metadata = { title: "Events" };

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  "not-open": "Not open",
  open: "Open",
  closed: "Closed",
};
const VERTICALS: EventVertical[] = ["technomedh", "cultural", "sports"];

/** Event CMS list (Phase 10.3): the 40 frozen events, grouped by vertical. */
export default async function AdminEventsPage() {
  await requireAdmin();

  let events: AdminEventSummary[] | null = null;
  let failure: string | undefined;
  try {
    events = await listEventsForAdmin();
  } catch (error) {
    failure = (error as Error).name === "CmsConfigError" ? (error as Error).message : undefined;
    console.error(`[cms] admin event list failed: ${(error as Error).message}`);
  }

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center type-meta text-fg-secondary hover:text-fg"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-2 type-h2 text-fg">Events</h1>
      <p className="mt-2 type-body text-fg-secondary">
        Edit the official details of each event. Names, departments and verticals are fixed.
      </p>
      <PublishingNotice />
      {!events && <CmsUnavailable detail={failure} />}

      {events &&
        VERTICALS.map((vertical) => {
          const list = events.filter((e) => e.identity.category === vertical);
          return (
            <section key={vertical} aria-labelledby={`events-${vertical}`} className="mt-10">
              <h2 id={`events-${vertical}`} className="type-title text-fg">
                {getVertical(vertical).shortName}{" "}
                <span className="type-meta text-fg-muted">({list.length})</span>
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {list.map((event) => (
                  <li key={event.identity.slug}>
                    <Link
                      href={`/admin/events/${event.identity.slug}`}
                      className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-line bg-surface px-4 py-2 hover:border-accent/55 focus-visible:border-accent/55"
                    >
                      <span className="flex flex-col">
                        <span className="type-body text-fg">{event.identity.name}</span>
                        {event.identity.department && (
                          <span className="type-meta text-fg-muted">
                            {event.identity.department}
                          </span>
                        )}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 type-meta text-fg-muted">
                        <span>{event.hasContent ? "Details entered" : "All TBA"}</span>
                        <span>Registration: {STATUS_LABEL[event.status]}</span>
                        <span>
                          {event.stored
                            ? `Updated ${formatSavedAt(event.updatedAt)}`
                            : "Not seeded"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}
