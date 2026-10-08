import Link from "next/link";
import { ChevronRight, Drama, Flame, Music, Settings, Trophy } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { scheduleRows } from "@/data/festival";
import { fact, venueFact } from "@/lib/display";

const rowIcons = {
  brand: Flame,
  technomedh: Settings,
  cultural: Drama,
  sports: Trophy,
  "cultural-night": Music,
} as const;

/**
 * Schedule category rows (reference panel 06). Titles are confirmed festival components;
 * time and venue stay TBA (OD-04, OD-05). Each row carries its own vertical colour.
 */
export function ScheduleList() {
  return (
    <ul className="flex flex-col gap-3">
      {scheduleRows.map((row) => (
        <li key={row.title} data-vertical={row.vertical}>
          <Link
            href={row.href}
            className="group grid min-h-16 grid-cols-[40px_1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg border border-line-subtle bg-surface-2 px-4 py-3 transition-colors duration-150 hover:border-line-strong hover:bg-white/[0.04] focus-visible:border-line-strong focus-visible:bg-white/[0.04] sm:grid-cols-[40px_7rem_1fr_auto_auto] sm:px-5"
          >
            <IconTile icon={rowIcons[row.vertical]} className="row-span-2 sm:row-span-1" />
            {/* Mobile: time and venue share the second line */}
            <span className="order-2 type-meta text-fg-muted tabular-nums sm:hidden">
              <span className="sr-only">Time: </span>
              {fact(row.time)} · <span className="sr-only">Venue: </span>
              {venueFact(row.venue)}
            </span>
            <span className="hidden type-meta text-fg-muted tabular-nums sm:inline">
              <span className="sr-only">Time: </span>
              {fact(row.time)}
            </span>
            <span className="type-title text-fg">{row.title}</span>
            <span className="hidden type-meta text-fg-muted sm:inline">
              <span className="sr-only">Venue: </span>
              {venueFact(row.venue)}
            </span>
            <ChevronRight
              aria-hidden
              className="row-span-2 size-4 text-fg-muted transition-transform motion-safe:group-hover:translate-x-0.5 sm:row-span-1"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
