import { VerticalArt } from "@/components/art/vertical-art";
import { ArrowLink } from "@/components/ui/button";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { culturalNight } from "@/data/festival";
import { fact } from "@/lib/display";

/**
 * Cultural Night band (reference panel 07): stage-light atmosphere, title, Day 1 / Day 2 cards.
 * Two nights are confirmed; dates are TBA. Used as the homepage preview and the page hero.
 */
export function CulturalNightBand({
  headingAs = "h2",
  showLink = false,
}: {
  headingAs?: "h1" | "h2";
  showLink?: boolean;
}) {
  const Heading = headingAs;
  return (
    <div
      data-vertical="cultural-night"
      className="relative isolate overflow-hidden rounded-xl border border-accent/55"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <VerticalArt vertical="cultural-night" variant={1} />
        <div className="absolute inset-0 bg-[radial-gradient(75%_85%_at_50%_40%,transparent_0%,rgb(3_6_11/0.6)_100%)]" />
      </div>

      <div className="flex flex-col items-center px-5 py-14 text-center sm:px-8 lg:py-20">
        <Heading
          id="cultural-night-title"
          className="type-display text-[color:color-mix(in_oklab,var(--accent)_38%,var(--color-fg))] [text-shadow:0_0_14px_color-mix(in_oklab,var(--accent)_60%,transparent),0_0_36px_color-mix(in_oklab,var(--accent)_35%,transparent)]"
        >
          Cultural Night
        </Heading>
        {/* OD-07: tagline area kept; reference text not used */}
        <CopyPlaceholder lines={1} align="center" className="mt-5 w-56" />

        <ul className="mt-10 grid w-full max-w-md grid-cols-2 gap-4">
          {culturalNight.nights.map((night) => (
            <li
              key={night.label}
              className="flex flex-col items-center gap-1 rounded-xl border border-accent/55 bg-surface/70 px-4 py-5 backdrop-blur-[2px]"
            >
              <span className="type-h3 text-accent normal-case">{night.label}</span>
              <span className="type-chip-value text-fg-muted">{fact(night.date)}</span>
            </li>
          ))}
        </ul>

        {showLink && (
          <div className="mt-8">
            <ArrowLink href="/cultural-night">Explore Cultural Night</ArrowLink>
          </div>
        )}
      </div>
    </div>
  );
}
