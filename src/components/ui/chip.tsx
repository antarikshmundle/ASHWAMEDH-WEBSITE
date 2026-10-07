import type { LucideIcon } from "lucide-react";
import { TBA } from "@/lib/display";

/** Field-based chip tones (DS-07) — identical in every vertical, never the context accent. */
const tones = {
  warm: { icon: "text-chip-warm", tile: "bg-chip-warm-tile", faint: "bg-chip-warm-tile/40" },
  field: { icon: "text-chip-field", tile: "bg-chip-field-tile", faint: "bg-chip-field-tile/40" },
  people: {
    icon: "text-chip-people",
    tile: "bg-chip-people-tile",
    faint: "bg-chip-people-tile/40",
  },
} as const;

export type ChipTone = keyof typeof tones;

/** Event-detail info chip (docs/design-system/components.md → Chips). */
export function Chip({
  icon: Icon,
  label,
  value,
  tone,
  faintTile = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: ChipTone;
  /** Venue: tile at 40 %, near-invisible as in the reference. */
  faintTile?: boolean;
}) {
  const t = tones[tone];
  return (
    <div className="flex min-h-12 items-center gap-3">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-sm ${faintTile ? t.faint : t.tile}`}
      >
        <Icon aria-hidden strokeWidth={1.75} className={`size-5 ${t.icon}`} />
      </span>
      <dl className="flex min-w-0 flex-col-reverse">
        <dt className="type-chip-label text-fg-muted">{label}</dt>
        <dd className={`type-chip-value ${value === TBA ? "text-fg-muted" : "text-fg"}`}>
          {value}
        </dd>
      </dl>
    </div>
  );
}
