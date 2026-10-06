# Inner Page Structures

Supports the sitemap ([sitemap-and-routes.md](sitemap-and-routes.md)) for pages not covered in
[event-discovery.md](event-discovery.md). Every page uses the shared sticky navbar and footer.
Tags: **[A]** reference · **[B]** confirmed · **[C]** TBA · **[OD-xx]** locked owner decision
([owner-decisions.md](owner-decisions.md)).

## `/events` — Events overview

Same content as homepage H2 (panel 03) as a standalone page: heading + four vertical cards. `h1` "Events".
Target of the plain "Events" nav link (OD-15). No additional sections.

## `/cultural-night` — Cultural Night (panel 07)

| Order | Block     | Content                                                                                                                                                      | Status                    |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1     | Hero      | `h1` "Cultural Night" + tagline area (reference text not used)                                                                                               | [A], OD-07                |
| 2     | Day cards | Day 1 — TBA · Day 2 — TBA                                                                                                                                    | [B] two nights, [C] dates |
| 3     | What's On | Exactly these confirmed components: **Group Dance · Singing · Solo Dance · Inauguration / Stage Performances**. No performer names, times or day assignment. | [B], OD-14                |

- **No public registration** on this page (OD-14). A registration CTA is added only if organisers provide an
  official process/form.
- No other blocks.

## `/schedule` — Schedule (panel 06)

| Order | Block    | Content                                                                                                                                                | Status                       |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1     | Header   | `h1` "Event Schedule", status line "Schedule Releasing Soon"                                                                                           | [A], D4                      |
| 2     | Day tabs | **Not shown** until the official number of days is confirmed                                                                                           | OD-04                        |
| 3     | Rows     | Icon · time · title · venue. Today: Inauguration Ceremony, Technomedh Events, Cultural Events, Sports Events, Cultural Night — time `TBA`, venue `TBA` | [B] titles, [C] times, OD-05 |

Rows link to the matching vertical page or `/cultural-night`. Reference venue names are never used (OD-05).

## `/venue` — Venue / Campus map (panel 08)

The access point for campus/venue information (OD-10). Reached from the homepage Venue preview, event
Venue tabs and the Contact page; not a navbar or footer item.

| Order | Block  | Content                                                              | Status         |
| ----- | ------ | -------------------------------------------------------------------- | -------------- |
| 1     | Header | `h1` "Campus Map" + sub-line area (reference text not used)          | [A], OD-07     |
| 2     | Map    | Abstract campus treatment — **no** pins, locations, labels or legend | OD-06, Phase 9 |
| 3     | Status | "Venue details coming soon."                                         | [C]            |

A location legend is added only when official locations are provided.

## `/about` — About

No reference panel. Minimal, confirmed-facts-only page:

- `h1` "About ASHWAMEDH" — ASHWAMEDH 2026 is the flagship annual college festival of Priyadarshini College of
  Engineering (PCE), Nagpur; the four verticals with links.
- About PCE — college name, Nagpur, PCE logo (unaltered).
- Any longer history/vision text requires official copy (Phase 1).

## `/contact` — Contact

- `h1` "Contact"; Phone · WhatsApp · Email — `TBA` (same items as footer).
- Link to `/venue` for campus/venue information (OD-10).
- No contact form (no backend). No social links until official handles exist (OD-08).

## `/gallery` — Gallery (OD-09)

- `h1` "Gallery" + "Gallery coming soon." No stock or reference imagery.

## `/team` — Organising committee (OD-09)

- `h1` "Team" + "Organising committee will be announced." No placeholder people.

## 404

- Short message, links to Home and Events.
