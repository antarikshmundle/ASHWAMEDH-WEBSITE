import type { Metadata } from "next";
import { VerticalsOverview } from "@/components/sections/verticals-overview";

export const metadata: Metadata = {
  title: "Events",
  alternates: { canonical: "/events" },
};

/** Events overview — the four verticals (docs/ux/page-structures.md). Target of the plain "Events" nav link (OD-15). */
export default function EventsPage() {
  return <VerticalsOverview headingAs="h1" title="Events" />;
}
