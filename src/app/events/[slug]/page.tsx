import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { EventDetail } from "@/components/sections/event-detail";
import { eventInventory, getEventBySlug, legacyEventSlugs, resolveEventSlug } from "@/data/events";
import { loadEvent } from "@/lib/cms/events";
import { site } from "@/data/site";
import { getVertical } from "@/data/verticals";
import { baseOpenGraph } from "@/lib/metadata";

/**
 * All event pages are generated at build time, plus one redirect per former slug
 * (none today). Unknown slugs 404.
 *
 * dynamicParams is on so that an event page can be regenerated after its CMS content is saved
 * (Phase 10.3) — with it off, Next.js keeps serving the old page once its cache tag expires.
 * Unknown or wrongly-cased slugs never reach this route: src/proxy.ts sends them to the 404 page,
 * so they are not rendered or cached here. The notFound() below is a second line of defence.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return [...eventInventory.map((event) => event.slug), ...legacyEventSlugs].map((slug) => ({
    slug,
  }));
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
  // Identity is frozen in the repository; content comes from the CMS source.
  const event = await loadEvent(slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
