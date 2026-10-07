import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VerticalArt } from "@/components/art/vertical-art";
import { fact, participation } from "@/lib/display";
import type { FestEvent } from "@/types/festival";

/**
 * Event card (reference panel 04, docs/design-system/components.md → Event cards).
 * Whole card is one link to /events/[slug]; department shown per OD-16 (omitted for Sports).
 */
export function EventCard({ event, index = 0 }: { event: FestEvent; index?: number }) {
  return (
    <Link
      href={`/events/${event.id}`}
      id={`event-${event.id}`}
      className="group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[transform,border-color,box-shadow] duration-150 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-card"
    >
      <div className="relative aspect-video overflow-hidden">
        {/* D5: abstract placeholder until official imagery exists */}
        <VerticalArt vertical={event.category} variant={index} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 lg:p-5">
        <h3 className="type-title text-fg">{event.name}</h3>
        {event.department && <p className="type-meta text-fg-secondary">{event.department}</p>}
        <p className="type-meta text-fg-muted">
          <span className="sr-only">Participation: </span>
          {participation(event.teamSize)}
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
