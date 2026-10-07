import type { Metadata } from "next";
import { SchedulePanel } from "@/components/sections/schedule-panel";

export const metadata: Metadata = {
  title: "Schedule",
  alternates: { canonical: "/schedule" },
};

/**
 * Schedule (reference panel 06). "Schedule Releasing Soon"; category rows with TBA times/venues.
 * No day tabs until the official day count exists (OD-04); no invented venues (OD-05).
 */
export default function SchedulePage() {
  return (
    <div className="container-site max-w-5xl pt-8 pb-16 lg:pt-12 lg:pb-24">
      <SchedulePanel headingAs="h1" />
    </div>
  );
}
