import { SectionHeading } from "@/components/ui/section-heading";
import { ScheduleList } from "@/components/sections/schedule-list";
import { scheduleStatus } from "@/lib/display";

/**
 * Schedule panel (reference panel 06): title, status line and the five category rows inside
 * one surface panel. No day tabs until the official day count exists (OD-04).
 */
export function SchedulePanel({ headingAs = "h2" }: { headingAs?: "h1" | "h2" }) {
  return (
    <div
      data-vertical="brand"
      className="rounded-xl border border-line bg-surface px-4 py-10 sm:px-8 lg:px-10 lg:py-12"
    >
      <SectionHeading
        as={headingAs}
        id="schedule-title"
        tone="plain"
        status={
          <>
            {scheduleStatus.lead} <span className="text-accent">{scheduleStatus.accent}</span>
          </>
        }
      >
        Event Schedule
      </SectionHeading>
      <div className="mt-10">
        <ScheduleList />
      </div>
    </div>
  );
}
