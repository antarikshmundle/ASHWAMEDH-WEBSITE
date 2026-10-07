import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { EventCard } from "@/components/cards/event-card";
import { EventDetail } from "@/components/sections/event-detail";
import { buildEvent, eventInventory, events, getEventBySlug } from "@/data/events";
import { placeholders } from "@/lib/display";
import type { ContentSource, EventDetailsInput, EventRecord } from "@/types/festival";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const source: ContentSource = { kind: "official-pdf", reference: "sample.pdf", date: "2026-11-02" };
const hackathon = eventInventory.find((e) => e.slug === "hackathon")!;
const withDetails = (details: Omit<EventDetailsInput, "source">): EventRecord =>
  buildEvent(hackathon, { source, ...details });

/** Server HTML without React's text-separator comments. */
const html = (node: ReactNode) => renderToString(node).replace(/<!-- -->/g, "");
/** Visible + screen-reader text only (tags removed). */
const plain = (markup: string) => markup.replace(/<[^>]+>/g, "");
/** The value shown in an event-detail chip, by its label. */
const chip = (markup: string, label: string) =>
  markup.match(new RegExp(`${label}</dt><dd[^>]*>([^<]*)</dd>`))?.[1];

describe("event detail and card rendering (Phase 6.3)", () => {
  it("renders every current fallback state while the registry is empty", () => {
    for (const slug of ["hackathon", "debate", "cricket"]) {
      const event = getEventBySlug(slug)!;
      const detail = html(<EventDetail event={event} />);
      for (const label of ["Participation", "Registration Fee", "Prize Pool", "Venue", "Team Size"])
        expect(chip(detail, label), `${slug} ${label}`).toBe("TBA");
      expect(chip(detail, "Date &amp; Time")).toBe("TBA");
      for (const text of [
        placeholders.description,
        placeholders.rules,
        placeholders.eligibility,
        placeholders.prizes,
        placeholders.venue,
        placeholders.coordinator,
        "Registration Opening Soon",
        "Event PDF Coming Soon",
      ])
        expect(detail, `${slug}: ${text}`).toContain(text);

      const card = plain(html(<EventCard event={event} />));
      expect(card).toContain("Participation: TBA");
      expect(card).toContain("Date: TBA");
    }
  });

  it("keeps the Prize Pool chip and the Prizes tab independent", () => {
    const poolOnly = html(<EventDetail event={withDetails({ prizePool: "₹10,000" })} />);
    expect(chip(poolOnly, "Prize Pool")).toBe("₹10,000");
    expect(poolOnly).toContain(placeholders.prizes);

    const detailsOnly = html(
      <EventDetail
        event={withDetails({ prizeDetails: ["Winner: ₹6,000", "Runner-up: ₹4,000"] })}
      />,
    );
    expect(chip(detailsOnly, "Prize Pool")).toBe("TBA");
    expect(detailsOnly).toContain("Winner: ₹6,000");
    expect(detailsOnly).toContain("Runner-up: ₹4,000");
    expect(detailsOnly).not.toContain(placeholders.prizes);
  });

  it("renders description and eligibility as one paragraph per item", () => {
    const detail = html(
      <EventDetail
        event={withDetails({
          description: ["First paragraph.", "Second paragraph."],
          eligibility: ["Open to all branches.", "Valid college ID required."],
        })}
      />,
    );
    for (const text of [
      "First paragraph.",
      "Second paragraph.",
      "Open to all branches.",
      "Valid college ID required.",
    ])
      expect(detail).toContain(`<p class="type-body text-fg-secondary">${text}</p>`);
    expect(detail).not.toContain(placeholders.description);
    expect(detail).not.toContain(placeholders.eligibility);
  });

  it("shows participation only when stated, never derived from team size", () => {
    const stated = withDetails({ participation: "individual-or-team", teamSize: "1–3 members" });
    expect(chip(html(<EventDetail event={stated} />), "Participation")).toBe("Individual / Team");
    expect(plain(html(<EventCard event={stated} />))).toContain("Participation: Individual / Team");

    const sizeOnly = withDetails({ teamSize: "1" });
    const detail = html(<EventDetail event={sizeOnly} />);
    expect(chip(detail, "Participation")).toBe("TBA");
    expect(chip(detail, "Team Size")).toBe("1");
  });

  it("resolves and renders all 39 events by slug", () => {
    expect(events).toHaveLength(39);
    for (const { slug, name } of eventInventory) {
      const event = getEventBySlug(slug);
      expect(event?.name, slug).toBe(name);
      const detail = html(<EventDetail event={event!} />);
      expect(detail).toContain(`<h1 id="event-title" class="type-h1 text-fg">${name}</h1>`);
      expect(html(<EventCard event={event!} />)).toContain(`href="/events/${slug}"`);
    }
    // 78 full renders (each with SVG art): allow more than the 5 s default on a busy machine.
  }, 20_000);
});
