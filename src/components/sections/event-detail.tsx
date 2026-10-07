import Link from "next/link";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Clock,
  Download,
  MapPin,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { VerticalArt } from "@/components/art/vertical-art";
import { DisabledCta, PrimaryLink, SecondaryLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Tabs } from "@/components/ui/tabs";
import { getEventsByVertical } from "@/data/events";
import { getVertical } from "@/data/verticals";
import {
  dateTime,
  fact,
  participation,
  pdfState,
  placeholders,
  registrationState,
} from "@/lib/display";
import type { FestEvent } from "@/types/festival";

/**
 * Reusable event-detail template (reference panel 05, docs/ux/event-discovery.md §7).
 * Every field renders from data; unknown values show TBA / Coming Soon in place.
 */
export function EventDetail({ event }: { event: FestEvent }) {
  const vertical = getVertical(event.category);
  const registration = registrationState(event);
  const pdf = pdfState(event.pdf);
  const variant = getEventsByVertical(event.category).findIndex((e) => e.id === event.id);

  const primaryCta =
    registration.kind === "open" ? (
      <PrimaryLink href={registration.href} external>
        {registration.label}
      </PrimaryLink>
    ) : (
      <DisabledCta full>{registration.label}</DisabledCta>
    );

  return (
    <div data-vertical={event.category}>
      <div className="container-wide pt-6 lg:pt-10">
        <Link
          href={vertical.href}
          className="inline-flex min-h-11 items-center gap-2 type-meta text-fg-secondary hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to {vertical.shortName}
        </Link>

        {/* Header block */}
        <section
          aria-labelledby="event-title"
          className="relative mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-panel"
        >
          <div className="grid lg:grid-cols-12">
            {/* Image (top on mobile/tablet, right on desktop) */}
            <div className="relative aspect-[16/8] lg:order-2 lg:col-span-5 lg:aspect-auto">
              <VerticalArt vertical={event.category} variant={variant} />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent lg:bg-gradient-to-r lg:from-surface lg:via-surface/30" />
            </div>

            <div className="relative p-5 sm:p-8 lg:order-1 lg:col-span-7 lg:p-10">
              <h1 id="event-title" className="type-h1 text-fg">
                {event.name}
              </h1>
              {event.department && (
                <p className="mt-3 type-label text-fg-muted">{event.department}</p>
              )}

              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
                <Chip
                  icon={Users}
                  tone="warm"
                  label="Participation"
                  value={participation(event.teamSize)}
                />
                <Chip
                  icon={Ticket}
                  tone="warm"
                  label="Registration Fee"
                  value={fact(event.registrationFee)}
                />
                <Chip icon={Award} tone="warm" label="Prize Pool" value={fact(event.prize)} />
                <Chip
                  icon={CalendarDays}
                  tone="field"
                  label="Date & Time"
                  value={dateTime(event.date, event.time)}
                />
                <Chip
                  icon={MapPin}
                  tone="field"
                  label="Venue"
                  value={fact(event.venue)}
                  faintTile
                />
                <Chip
                  icon={UserRound}
                  tone="people"
                  label="Team Size"
                  value={fact(event.teamSize)}
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <div className="hidden min-w-64 lg:block">{primaryCta}</div>
                {pdf.kind === "available" ? (
                  <SecondaryLink
                    href={pdf.href}
                    external
                    icon={<Download aria-hidden className="size-[18px]" />}
                  >
                    Download Event PDF
                  </SecondaryLink>
                ) : (
                  <DisabledCta>{pdf.label}</DisabledCta>
                )}
              </div>
              {registration.kind === "open" && event.registrationDeadline && (
                <p className="mt-3 type-meta text-fg-muted">
                  Registration deadline: {event.registrationDeadline}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section aria-label="Event information" className="pt-8 pb-16 lg:pt-12 lg:pb-24">
          <Tabs
            label={`${event.name} information`}
            tabs={[
              {
                id: "about",
                label: "About",
                content: <TextOr value={event.description} fallback={placeholders.description} />,
              },
              {
                id: "rules",
                label: "Rules",
                content: <ListOr items={event.rules} fallback={placeholders.rules} />,
              },
              {
                id: "eligibility",
                label: "Eligibility",
                content: <TextOr value={event.eligibility} fallback={placeholders.eligibility} />,
              },
              {
                id: "prizes",
                label: "Prizes",
                content: <TextOr value={event.prize} fallback={placeholders.prizes} />,
              },
              {
                id: "venue",
                label: "Venue",
                content: (
                  <div className="flex flex-col items-start gap-2">
                    <TextOr value={event.venue} fallback={placeholders.venue} />
                    <Link
                      href="/venue"
                      className="inline-flex min-h-11 items-center type-meta text-accent underline underline-offset-4"
                    >
                      View campus map
                    </Link>
                  </div>
                ),
              },
              {
                id: "coordinator",
                label: "Coordinator",
                content: event.coordinator?.length ? (
                  <ul className="flex flex-col gap-3">
                    {event.coordinator.map((c) => (
                      <li key={c.name} className="type-body text-fg-secondary">
                        <span className="font-semibold text-fg">{c.name}</span>
                        {c.phone && <> · {c.phone}</>}
                        {c.email && <> · {c.email}</>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ComingSoon>{placeholders.coordinator}</ComingSoon>
                ),
              },
            ]}
          />
        </section>
      </div>

      {/* Mobile/tablet: primary CTA in a sticky bottom bar (docs/ux/mobile.md) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-subtle bg-raised/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        {primaryCta}
      </div>
      <div aria-hidden className="h-[76px] lg:hidden" />
    </div>
  );
}

function ComingSoon({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 type-body text-fg-muted">
      <Clock aria-hidden className="size-[18px] shrink-0" />
      {children}
    </p>
  );
}

function TextOr({ value, fallback }: { value: string | null; fallback: string }) {
  return value ? (
    <p className="type-body text-fg-secondary">{value}</p>
  ) : (
    <ComingSoon>{fallback}</ComingSoon>
  );
}

function ListOr({ items, fallback }: { items: string[] | null; fallback: string }) {
  if (!items?.length) return <ComingSoon>{fallback}</ComingSoon>;
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5 type-body text-fg-secondary marker:text-accent">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}
