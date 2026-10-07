"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

/**
 * Mobile/tablet replacement for the listing sidebar (docs/ux/mobile.md → Event listing):
 * a disclosure that lists every event of the vertical as direct links.
 */
export function JumpToEvent({ events }: { events: readonly { slug: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 type-nav text-fg"
      >
        Jump to event
        <ChevronDown
          aria-hidden
          className={`size-5 text-accent transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <ul id={panelId} hidden={!open} className="border-t border-line-subtle py-1">
        {events.map((event) => (
          <li key={event.slug}>
            <Link
              href={`/events/${event.slug}`}
              className="flex min-h-11 items-center px-4 type-body-sm text-fg-secondary hover:bg-white/[0.04] hover:text-fg"
            >
              {event.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
