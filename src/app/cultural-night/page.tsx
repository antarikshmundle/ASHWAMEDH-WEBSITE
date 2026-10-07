import type { Metadata } from "next";
import { Footprints, Mic, Sparkles, Users } from "lucide-react";
import { CulturalNightBand } from "@/components/sections/cultural-night-band";
import { culturalNight } from "@/data/festival";

export const metadata: Metadata = {
  title: "Cultural Night",
  alternates: { canonical: "/cultural-night" },
};

const icons = [Users, Mic, Footprints, Sparkles];

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
          {culturalNight.whatsOn.map((item, i) => {
            const Icon = icons[i] ?? Sparkles;
            return (
              <li
                key={item}
                className="flex min-h-20 items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent/12">
                  <Icon aria-hidden strokeWidth={1.5} className="size-5 text-accent" />
                </span>
                <span className="type-title text-fg">{item}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
