import type { Metadata } from "next";
import { Footprints, Mic, Sparkles, Users, type LucideIcon } from "lucide-react";
import { CulturalNightBand } from "@/components/sections/cultural-night-band";
import { IconTile } from "@/components/ui/icon-tile";
import { culturalNight } from "@/data/festival";

export const metadata: Metadata = {
  title: "Cultural Night",
  alternates: { canonical: "/cultural-night" },
};

/** Keyed by item, so reordering the data never changes an item's icon. Typed to cover every item. */
const icons: Record<(typeof culturalNight.whatsOn)[number], LucideIcon> = {
  "Group Dance": Users,
  Singing: Mic,
  "Solo Dance": Footprints,
  "Inauguration / Stage Performances": Sparkles,
};

/**
 * Cultural Night (reference panel 07, OD-14): hero band, Day 1 / Day 2 (TBA), and "What's On"
 * with only the four confirmed components. No public registration.
 */
export default function CulturalNightPage() {
  return (
    <div data-vertical="cultural-night">
      <div className="container-site pt-8 lg:pt-12">
        <CulturalNightBand headingAs="h1" />
      </div>

      <section aria-labelledby="whats-on" className="container-site section-y pt-12 lg:pt-16">
        <h2 id="whats-on" className="type-h2 text-fg">
          What&apos;s On
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {culturalNight.whatsOn.map((item) => (
            <li
              key={item}
              className="flex min-h-20 items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4"
            >
              <IconTile icon={icons[item]} />
              <span className="type-title text-fg">{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
