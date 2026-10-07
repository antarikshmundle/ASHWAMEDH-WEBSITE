import type { Metadata } from "next";
import { EventListing } from "@/components/sections/event-listing";

export const metadata: Metadata = {
  title: "Sports",
  alternates: { canonical: "/sports" },
};

export default function SportsPage() {
  return <EventListing vertical="sports" />;
}
