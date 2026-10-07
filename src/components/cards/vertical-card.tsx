import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VerticalArt } from "@/components/art/vertical-art";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { VerticalIcon } from "@/components/ui/vertical-icon";
import type { VerticalInfo } from "@/data/verticals";

/** Overview card (reference panel 03, docs/design-system/components.md → Vertical cards). Whole card is one link. */
export function VerticalCard({
  vertical,
  headingLevel = "h3",
}: {
  vertical: VerticalInfo;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <Link
      href={vertical.href}
      data-vertical={vertical.id}
      className="group relative flex aspect-[4/3.4] flex-col overflow-hidden rounded-lg bg-surface glow-sm transition-[transform,box-shadow] duration-150 ease-[var(--ease-standard)] hover:-translate-y-1 hover:glow-md sm:aspect-[3/4.4]"
    >
      <div className="relative h-[62%] overflow-hidden">
        <VerticalArt
          vertical={vertical.id}
          className="transition-transform duration-240 ease-[var(--ease-out)] group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface to-transparent" />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 lg:px-6">
        <Heading className="type-h3 text-accent">{vertical.shortName}</Heading>
        {/* OD-07: tagline area kept; reference text not used */}
        {vertical.tagline ? (
          <p className="mt-2 type-label text-fg-muted">{vertical.tagline}</p>
        ) : (
          <CopyPlaceholder lines={1} className="mt-4 w-3/4" />
        )}
        <div className="mt-auto flex items-center justify-between border-t border-line-subtle pt-4">
          <span className="inline-flex items-center gap-2 type-meta text-accent">
            {vertical.linkLabel}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-150 group-hover:translate-x-1"
            />
          </span>
          <VerticalIcon name={vertical.icon} className="size-7 text-accent" />
        </div>
      </div>
    </Link>
  );
}
