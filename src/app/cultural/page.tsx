import type { Metadata } from "next";
import { EventListing } from "@/components/sections/event-listing";

export const metadata: Metadata = {
  title: "Cultural Events",
  alternates: { canonical: "/cultural" },
};

export default function CulturalEventsPage() {
  return <EventListing vertical="cultural" />;
}
