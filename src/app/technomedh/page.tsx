import type { Metadata } from "next";
import { EventListing } from "@/components/sections/event-listing";

export const metadata: Metadata = {
  title: "Technomedh",
  alternates: { canonical: "/technomedh" },
};

export default function TechnomedhPage() {
  return <EventListing vertical="technomedh" />;
}
