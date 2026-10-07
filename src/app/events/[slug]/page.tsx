import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/sections/event-detail";
import { events, getEventBySlug } from "@/data/events";
import { site } from "@/data/site";
import { getVertical } from "@/data/verticals";

/** All 39 event pages are generated at build time; unknown slugs 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.id }));
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return {};
  const vertical = getVertical(event.category);
  // Factual only: name, vertical, department, festival. No invented descriptions.
  const description = [
    `${event.name} — ${vertical.name}`,
    event.department,
    `${site.name}, ${site.college}, ${site.city}.`,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: event.name,
    description,
    alternates: { canonical: `/events/${event.id}` },
    openGraph: { title: `${event.name} | ${site.name}`, description },
  };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
