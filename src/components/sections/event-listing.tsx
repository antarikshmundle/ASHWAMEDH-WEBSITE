import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { VerticalArt } from "@/components/art/vertical-art";
import { EventCard } from "@/components/cards/event-card";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { JumpToEvent } from "@/components/ui/jump-to-event";
import { VerticalIcon } from "@/components/ui/vertical-icon";
import { getEventsByVertical } from "@/data/events";
import { getVertical } from "@/data/verticals";
import type { EventVertical } from "@/types/festival";

/**
 * Reusable vertical listing (reference panel 04, docs/ux/event-discovery.md §6).
 * Desktop: sticky sidebar + 3-column grid. Mobile/tablet: "Jump to event" + 1/2-column grid.
 */
export function EventListing({ vertical }: { vertical: EventVertical }) {
  const info = getVertical(vertical);
  const list = getEventsByVertical(vertical);

  return (
    <div data-vertical={vertical} className="relative">
      {/* Header band with the vertical's motif (≤ 8 % texture) */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden opacity-[0.18]"
      >
        <VerticalArt vertical={vertical} variant={3} />
        <div className="absolute inset-0 bg-gradient-to-b from-base/40 to-base" />
      </div>

      <div className="container-wide pt-10 pb-16 lg:pt-14 lg:pb-24">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <aside className="hidden lg:col-span-3 lg:block">
            <nav
              aria-label={`${info.shortName} events`}
              className="sticky top-24 rounded-lg border border-line bg-surface p-5"
            >
              <p className="flex items-center gap-2 type-h3 text-accent">
                <VerticalIcon name={info.icon} className="size-5" />
                {info.shortName}
              </p>
              <ul className="mt-5 flex flex-col gap-1">
                <li>
                  <Link
                    href={info.href}
                    aria-current="page"
                    className="flex min-h-11 items-center gap-3 rounded-md border border-accent/55 bg-surface-3 px-3 type-body-sm font-medium text-fg"
                  >
                    <LayoutGrid aria-hidden className="size-[18px] text-accent" />
                    All Events
                  </Link>
                </li>
                {list.map((event) => (
                  <li key={event.slug}>
                    <Link
                      href={`/events/${event.slug}`}
                      className="flex min-h-11 items-center rounded-md px-3 type-body-sm font-medium text-fg-secondary transition-colors hover:bg-white/[0.04] hover:text-fg"
                    >
                      {event.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="lg:col-span-9">
            <header className="flex flex-col items-center text-center">
              <h1 className="type-h1 text-accent">{info.shortName}</h1>
              {/* OD-07: tagline area kept; reference text not used */}
              {info.tagline ? (
                <p className="mt-3 type-label text-fg">{info.tagline}</p>
              ) : (
                <CopyPlaceholder lines={1} align="center" className="mt-4 w-56" />
              )}
            </header>

            <div className="mt-8 lg:hidden">
              <JumpToEvent events={list} />
            </div>

            <h2 className="sr-only">All {info.shortName} events</h2>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:mt-10 lg:grid-cols-3 lg:gap-6">
              {list.map((event, i) => (
                <li key={event.slug}>
                  <EventCard event={event} index={i} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
