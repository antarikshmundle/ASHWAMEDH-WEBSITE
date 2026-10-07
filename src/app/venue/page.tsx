import type { Metadata } from "next";
import { VenueMap } from "@/components/sections/venue-map";

export const metadata: Metadata = {
  title: "Venue",
  alternates: { canonical: "/venue" },
};

/** Venue / campus map (reference panel 08). Abstract treatment only — no pins, labels or legend (OD-06). */
export default function VenuePage() {
  return (
    <div className="container-site pt-8 pb-16 lg:pt-12 lg:pb-24">
      <VenueMap headingAs="h1" />
    </div>
  );
}
