import type { LucideIcon } from "lucide-react";

/**
 * Square accent icon tile (40 px, accent at 12 %, 20 px icon). Decorative: the icon is hidden
 * from assistive technology; the adjacent text carries the meaning. Context accent only —
 * event-detail chips use the fixed chip palette instead (ui/chip.tsx, DS-07).
 */
export function IconTile({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent/12 ${className}`}
    >
      <Icon aria-hidden strokeWidth={1.5} className="size-5 text-accent" />
    </span>
  );
}
