# Event Data — Authoring Guide

How to add official event information to the site. Read this before editing anything in
`src/data/events/`.

**The one rule:** only enter what an official source states. If the source does not say it, leave it
out — the site shows TBA / Coming Soon in its place. Never write placeholder or "likely" values.

## Where things live

| File                           | What it holds                                                                    | Who edits it                          |
| ------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------- |
| `src/data/events/inventory.ts` | The 39 events: slug, official name, vertical, department, order. **Frozen.**     | Only for an official inventory change |
| `src/data/events/details.ts`   | Official details per event (rules, fees, prizes…), keyed by slug. Empty for now. | When an official PDF / form arrives   |
| `src/data/events/build.ts`     | `buildEvent()` — combines identity + details. No content here.                   | Developers only                       |
| `src/data/events/slugs.ts`     | Slug lookup and redirects for former slugs. No content here.                     | Developers only                       |

## 1. Identity (inventory) — frozen

Each event's identity is its **slug**, **official name**, **vertical** and **department**
(`null` for Sports). The order of the list is the order on the listing pages.

- The slug is the event's permanent URL: `/events/<slug>`. It is written out explicitly and never
  generated at runtime, so a name edit can never change a URL by accident.
- Slug rule (`docs/ux/sitemap-and-routes.md` §3): lowercase kebab-case of the official name, text in
  parentheses dropped, `&` → `and`. Example: "SDGineer (Poster Presentation)" → `sdgineer`.
- `tests/unit/event-identity.test.ts` holds a frozen snapshot of all 39 identities. Any change to the
  inventory fails that test on purpose — update both only for an owner-approved official change.

## 2. Official details — `details.ts`

Add one entry per event, keyed by its slug. Every entry **must** record its source:

```ts
export const eventDetails: Partial<Record<EventSlug, EventDetailsInput>> = {
  hackathon: {
    source: { kind: "official-pdf", reference: "IT_Hackathon_2026.pdf", date: "2026-11-02" },
    description: ["First paragraph from the PDF.", "Second paragraph."],
    participation: "team",
    teamSize: "2–4 members",
    prizePool: "₹10,000",
    prizeDetails: ["Winner: ₹6,000", "Runner-up: ₹4,000"],
  },
};
```

- `source.kind`: `official-pdf`, `official-form`, or `owner-confirmed`.
- `source.reference`: the PDF file name, form title, or who confirmed it.
- `source.date`: the date you entered it, as `YYYY-MM-DD`.
- A misspelled slug or a missing `source` fails `npm run typecheck`. A malformed source fails the build.

### Fields

| Field                                                | Shown as                    | Enter                                                                        |
| ---------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| `description`                                        | About tab                   | A list — one string per paragraph, copied from the official text             |
| `rules`                                              | Rules tab (numbered list)   | One string per rule                                                          |
| `eligibility`                                        | Eligibility tab             | A list — one string per paragraph                                            |
| `participation`                                      | "Participation" chip, card  | `"individual"`, `"team"` or `"individual-or-team"` — only if the source says |
| `teamSize`                                           | "Team Size" chip            | The official wording, e.g. `"2–4 members"`                                   |
| `registrationFee`                                    | "Registration Fee" chip     | The official wording, e.g. `"₹100 per team"`                                 |
| `prizePool`                                          | "Prize Pool" chip           | A **short** value, e.g. `"₹10,000"`                                          |
| `prizeDetails`                                       | Prizes tab                  | The full breakdown, one line each                                            |
| `date`, `time`                                       | "Date & Time" chip, card    | Official wording (free text); both optional                                  |
| `venue`                                              | "Venue" chip + Venue tab    | Official venue name                                                          |
| `coordinators`                                       | Coordinator tab             | `{ name, phone, email }` — `phone` / `email` may be `null`                   |
| `image`                                              | Card + detail header        | A file in `public/images/events/`, written as `/images/events/<file>`        |
| `pdf`                                                | "Download Event PDF" button | Path or URL of the official PDF                                              |
| `registrationLink`, `registrationDeadline`, `status` | Registration CTA            | Phase 7 — leave out until the registration phase                             |

Notes:

- **Participation is never guessed from the team size.** "2–4 members" does not imply `"team"` unless
  the source says the event is a team event. If unsure, leave `participation` out (→ TBA).
- **Prize Pool vs Prizes:** the chip needs one short amount; the tab holds the breakdown. They are
  independent — enter only what the source gives.
- Values are trimmed; blank strings and empty lists count as "not given".

## 3. When information is unknown

Leave the field out. Do not write `"TBA"`, `"Coming soon"`, `"-"` or a guess. The display layer
(`src/lib/display.ts`) turns missing values into the agreed wording:

| Missing                                                    | Shown                                          |
| ---------------------------------------------------------- | ---------------------------------------------- |
| A chip value                                               | TBA                                            |
| About / Rules / Eligibility / Prizes / Venue / Coordinator | "…coming soon" / "…will be announced" sentence |
| Registration link                                          | "Registration Opening Soon" (disabled)         |
| PDF                                                        | "Event PDF Coming Soon" (disabled)             |
| Image                                                      | Abstract vertical artwork                      |

## 4. Renamed events — `legacySlugs`

If an event's **official name** changes:

1. Update `name` and `slug` in `inventory.ts` (and the snapshot test).
2. Add the old slug to that event's `legacySlugs`, so shared links keep working:
   ```ts
   { slug: "business-ideathon", name: "Business Ideathon", legacySlugs: ["ideathon"], … }
   ```
3. Move its `details.ts` entry to the new slug key.

The old URL then answers with a permanent **308** redirect to the new one — always one hop. The build
fails if a former slug equals a live slug, is listed twice, or is malformed. Only real former URLs go
here; there are none today.

> Hosting note: on `next start` the redirect is a real HTTP 308. The static HTML also carries Next's
> client-side redirect for static hosting. Re-check redirects on the final host once it is chosen.

## 5. Before you commit content

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. The tests check that every
details entry has a valid source, every key is a real slug, and the 39 identities are unchanged.
