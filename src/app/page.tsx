import { ArrowLink } from "@/components/ui/button";
import { CulturalNightBand } from "@/components/sections/cultural-night-band";
import { HomeHero } from "@/components/sections/home-hero";
import { SchedulePanel } from "@/components/sections/schedule-panel";
import { VenueMap } from "@/components/sections/venue-map";
import { VerticalsOverview } from "@/components/sections/verticals-overview";

/**
 * Homepage — locked order (docs/ux/homepage.md, OD-11):
 * Hero → Four verticals → Schedule preview → Cultural Night preview → Venue preview → (Footer).
 * No "Featured Events" section.
 */
export default function HomePage() {
  return (
    <>
      <HomeHero />

      <VerticalsOverview id="explore" />

      <section
        data-vertical="brand"
        aria-labelledby="schedule-title"
        className="section-y pt-0 lg:pt-0"
      >
        <div className="container-site max-w-5xl">
          <SchedulePanel />
          <div className="mt-6 flex justify-center">
            <ArrowLink href="/schedule">View Schedule</ArrowLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="cultural-night-title" className="pb-16 md:pb-20 lg:pb-28">
        <div className="container-site">
          <CulturalNightBand showLink />
        </div>
      </section>

      <section aria-labelledby="venue-title" className="pb-16 md:pb-20 lg:pb-28">
        <div className="container-site">
          <VenueMap showLink />
        </div>
      </section>
    </>
  );
}
