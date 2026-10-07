import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { EventDetail } from "@/components/sections/event-detail";
import { events, getEventBySlug, legacyEventSlugs, resolveEventSlug } from "@/data/events";
import { site } from "@/data/site";
import { getVertical } from "@/data/verticals";
import { baseOpenGraph } from "@/lib/metadata";

/**
 * All 39 event pages are generated at build time, plus one redirect per former slug
 * (none today). Unknown slugs 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [...events.map((event) => event.slug), ...legacyEventSlugs].map((slug) => ({ slug }));
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
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: { ...baseOpenGraph, title: `${event.name} | ${site.name}`, description },
  };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  // Former URL after an official rename: 308 to the live page (one hop, never a loop).
  const resolved = resolveEventSlug(slug);
  if (resolved.kind === "legacy") permanentRedirect(`/events/${resolved.canonical}`);
  const event = getEventBySlug(slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
