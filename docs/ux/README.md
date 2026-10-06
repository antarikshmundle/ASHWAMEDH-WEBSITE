# Phase 2 — UX / Information Architecture

Status: **Phase 2 LOCKED (2026-10-06).** All owner decisions OD-01 … OD-16 are locked.

This folder defines the structure and user journeys of the ASHWAMEDH 2026 website **before** any visual
implementation. It contains no styling, components, animation or data.

## Sources of truth

| Source                                                                  | Authoritative for                                                                                          | Not authoritative for                                                                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [Locked UI/UX reference](reference/ashwamedh-final-ui-reference.jpg)    | Visual hierarchy, page/section relationships, navigation intent, discovery experience, information density | Event names, descriptions, dates, venues, day count, taglines, social handles, map locations, photography |
| [Master prompt](../requirements/master-prompt-v1.md) §6 event inventory | Event names, departments, verticals, known Cultural Night components                                       | —                                                                                                         |
| [Decisions log](../requirements/decisions-log.md)                       | Owner corrections (D1–D7) — override the master prompt                                                     | —                                                                                                         |
| [Owner decisions](owner-decisions.md)                                   | Locked Phase 2 decisions OD-01 … OD-16                                                                     | —                                                                                                         |

Photorealistic imagery in the reference (people, robots, rockets, crowds, stage) is **design reference only**
and must never be presented as actual Ashwamedh photography (D5).

## Documents

| #        | Topic                                                                                                        | Document                                       |
| -------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 1, 9     | Sitemap, URL / route structure                                                                               | [sitemap-and-routes.md](sitemap-and-routes.md) |
| 2, 3, 14 | Desktop navigation, mobile navigation, footer                                                                | [navigation.md](navigation.md)                 |
| 4        | Homepage information hierarchy                                                                               | [homepage.md](homepage.md)                     |
| 5–8      | Vertical discovery, event listing, event detail, registration flow                                           | [event-discovery.md](event-discovery.md)       |
| 10, 11   | CTA hierarchy, TBA / Coming Soon / unavailable states                                                        | [states-and-ctas.md](states-and-ctas.md)       |
| 12       | Mobile UX                                                                                                    | [mobile.md](mobile.md)                         |
| 13       | Core user journeys                                                                                           | [user-journeys.md](user-journeys.md)           |
| —        | Inner page structures (Events overview, Cultural Night, Schedule, Venue, About, Contact, Gallery, Team, 404) | [page-structures.md](page-structures.md)       |
| 15       | Content dependencies from Phase 1                                                                            | [../content/README.md](../content/README.md)   |
| —        | Owner decisions (locked)                                                                                     | [owner-decisions.md](owner-decisions.md)       |

## Separation of information (A–E)

Every Phase 2 document tags statements with one of these categories.

### A. UX decisions derived from the reference

- Nine reference panels define: homepage hero, sticky navbar, four-vertical overview, vertical event listing,
  event detail, schedule, Cultural Night, venue / campus map, footer.
- Primary nav order: Home · Events · Cultural Night · Schedule · Gallery · Team · About · Contact + one
  outlined "Coming Soon" CTA on the right, currently disabled (OD-09, OD-12, OD-15).
- Four vertical cards (Technomedh, Cultural, Sports, Cultural Night) are the main entry into events.
- Vertical listing = sidebar (desktop) + 3-column card grid; each card has image, name, department
  (OD-16), one meta line, "View Details".
- Event detail = back link, title, six info chips, primary "Register Now" + secondary "Download Event PDF",
  six tabs (About, Rules, Eligibility, Prizes, Venue, Coordinator).
- Unknown values are displayed as "TBA" in place, not hidden — the reference itself does this.

### B. Official information already confirmed

- Festival: ASHWAMEDH 2026, Priyadarshini College of Engineering (PCE), Nagpur — "PCE's flagship annual
  college festival".
- Verticals: Technomedh, Cultural Events, Sports, Cultural Night.
- Event inventory: 14 Technomedh, 15 Cultural, 10 Sports events with names and departments (master prompt §6).
- Cultural Night: 2-night event. Components shown publicly ("What's On", OD-14): Group Dance · Singing ·
  Solo Dance · Inauguration / Stage Performances. No public registration.
- Registration path: event page → official Google Form (no custom backend, login or payment).
- Logos: Ashwamedh logo (reference asset, colors not final), PCE logo (official, unaltered).

### C. Information currently TBA

Festival dates, schedule, day count of the overall festival, all event descriptions, rules, eligibility,
team sizes, fees, prizes, venues, timings, coordinators, registration deadlines, Google Form links,
official PDFs, Cultural Night performers and timings, campus map locations, organising committee,
contact details, social handles, sponsors, gallery imagery, final branding. See
[../content/README.md](../content/README.md).

### D. Owner decisions

All 16 are **locked**, including the OD-12 clarification: the hero and navbar "Coming Soon" are both disabled.
See [owner-decisions.md](owner-decisions.md).

### E. Future implementation dependencies

| Depends on                                                                 | Needed by                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| Phase 3 design system (tokens, vertical themes, placeholder art direction) | Phase 4/5 UI                                            |
| Official launch info / dates (replaces disabled "Coming Soon", OD-12)      | Active navbar + hero CTA                                |
| Approved official copy (OD-07)                                             | Tagline / description copy areas                        |
| Official social handles (OD-08)                                            | Footer social icons                                     |
| Official Cultural Night registration process, if any (OD-14)               | Cultural Night registration CTA                         |
| Phase 6 event data module (typed, `null` for unknowns)                     | Listing + detail pages                                  |
| Official Google Form links per event                                       | Phase 7 registration (CTA switches automatically)       |
| Official PDFs                                                              | "Download Event PDF" activation                         |
| Official venues + campus layout                                            | Phase 9 campus map                                      |
| Official date                                                              | Schedule, Cultural Night day labels, SEO event metadata |
| `NEXT_PUBLIC_SITE_URL` / hosting decision                                  | Canonical URLs, sitemap, Open Graph                     |
