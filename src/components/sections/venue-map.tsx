import { MapPinOff } from "lucide-react";
import { MapArt } from "@/components/art/map-art";
import { ArrowLink } from "@/components/ui/button";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { placeholders } from "@/lib/display";

/**
 * Venue / campus map container (reference panel 08). Abstract treatment only —
 * no pins, locations, labels or legend until official (OD-06).
 */
export function VenueMap({
  headingAs = "h2",
  showLink = false,
}: {
  headingAs?: "h1" | "h2";
  showLink?: boolean;
}) {
  const Heading = headingAs;
  return (
    <div data-vertical="brand" className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-col items-center px-5 pt-8 text-center sm:pt-9">
        <Heading id="venue-title" className="type-display text-fg">
          Campus Map
        </Heading>
        {/* OD-07: sub-line area kept; reference text not used */}
        <CopyPlaceholder lines={1} align="center" className="mt-5 w-52" />
      </div>
      <div className="relative mt-4 aspect-[4/3] sm:aspect-[21/7]">
        <MapArt className="[mask-image:linear-gradient(to_bottom,transparent,black_22%)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-line-control bg-base/70">
            <MapPinOff aria-hidden strokeWidth={1.5} className="size-5 text-fg-muted" />
          </span>
          <p className="type-body-sm text-fg-muted">{placeholders.venueMap}</p>
          {showLink && <ArrowLink href="/venue">View Campus Map</ArrowLink>}
        </div>
      </div>
    </div>
  );
}
