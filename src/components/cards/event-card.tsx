import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventImage } from "@/components/ui/event-image";
import { fact, participationLabel } from "@/lib/display";
import type { EventRecord } from "@/types/festival";

/**
 * Event card (reference panel 04, docs/design-system/components.md → Event cards).
 * Whole card is one link to /events/[slug]; department shown per OD-16 (omitted for Sports).
 */
export function EventCard({ event, index = 0 }: { event: EventRecord; index?: number }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      id={`event-${event.slug}`}
      className="group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[transform,border-color,box-shadow] duration-150 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-card"
    >
      <div className="relative aspect-video overflow-hidden">
        {/* Official image, or the abstract placeholder until one exists (D5) */}
        <EventImage
          event={event}
          variant={index}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 lg:p-5">
        <h3 className="type-title text-fg">{event.name}</h3>
        {event.department && <p className="type-meta text-fg-secondary">{event.department}</p>}
        <p className="type-meta text-fg-muted">
          <span className="sr-only">Participation: </span>
          {participationLabel(event.participation)}
          <span aria-hidden className="mx-2 text-line-strong">
            |
          </span>
          <span className="sr-only">Date: </span>
          {fact(event.date)}
        </p>
        <span className="mt-3 inline-flex h-9 w-fit items-center gap-2 rounded-md border border-accent/55 px-3 type-meta text-accent transition-colors group-hover:border-accent">
          View Details
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
