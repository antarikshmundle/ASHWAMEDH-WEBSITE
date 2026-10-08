# Event Data — Authoring Guide

How to add official event information to the site. Read this before editing anything in
`src/data/events/`.

**The one rule:** only enter what an official source states. If the source does not say it, leave it
out — the site shows TBA / Coming Soon in its place. Never write placeholder or "likely" values.

## Where things live

| File                           | What it holds                                                                          | Who edits it                          |
| ------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------- |
| `src/data/events/inventory.ts` | The 40 events: slug, official name, vertical, department, order. **Frozen.**           | Only for an official inventory change |
| `src/data/events/details.ts`   | Official details per event (rules, fees, coordinators…), keyed by slug. Empty for now. | When an official PDF / form arrives   |
| `src/data/events/build.ts`     | `buildEvent()` — combines identity + details. No content here.                         | Developers only                       |
| `src/data/events/slugs.ts`     | Slug lookup and redirects for former slugs. No content here.                           | Developers only                       |

## 1. Identity (inventory) — frozen

Each event's identity is its **slug**, **official name**, **vertical** and **department**
(`null` for Sports). The order of the list is the order on the listing pages.

- The slug is the event's permanent URL: `/events/<slug>`. It is written out explicitly and never
  generated at runtime, so a name edit can never change a URL by accident.
- Slug rule (`docs/ux/sitemap-and-routes.md` §3): lowercase kebab-case of the official name, text in
  parentheses dropped, `&` → `and`. Example: "SDGineer (Poster Presentation)" → `sdgineer`.
- `tests/unit/event-identity.test.ts` holds a frozen snapshot of all 40 identities. Any change to the
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
  },
};
```

- `source.kind`: `official-pdf`, `official-form`, or `owner-confirmed`.
- `source.reference`: the PDF file name, form title, or who confirmed it.
- `source.date`: the date you entered it, as `YYYY-MM-DD`.
- A misspelled slug or a missing `source` fails `npm run typecheck`. A malformed source fails the build.

### Fields

| Field                                                | Shown as                   | Enter                                                                        |
| ---------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| `description`                                        | About tab                  | A list — one string per paragraph, copied from the official text             |
| `rules`                                              | Rules tab (numbered list)  | One string per rule                                                          |
| `eligibility`                                        | Eligibility tab            | A list — one string per paragraph                                            |
| `participation`                                      | "Participation" chip, card | `"individual"`, `"team"` or `"individual-or-team"` — only if the source says |
| `teamSize`                                           | "Team Size" chip           | The official wording, e.g. `"2–4 members"`                                   |
| `registrationFee`                                    | "Registration Fee" chip    | The official wording, e.g. `"₹100 per team"`                                 |
| `date`, `time`                                       | "Date & Time" chip, card   | Official wording (free text); both optional                                  |
| `venue`                                              | "Venue" chip + Venue tab   | Official venue name                                                          |
| `coordinators`                                       | Coordinator tab            | `{ name, phone, email }` — `phone` / `email` may be `null`                   |
| `image`                                              | Card + detail header       | A file in `public/images/events/`, written as `/images/events/<file>`        |
| `pdf`                                                | "View Guidelines PDF"      | Official PDF — see §3 for the allowed forms                                  |
| `registrationLink`, `registrationDeadline`, `status` | Registration CTA           | See §3 — only when an official form exists                                   |

Notes:

- **Participation is never guessed from the team size.** "2–4 members" does not imply `"team"` unless
  the source says the event is a team event. If unsure, leave `participation` out (→ TBA).
- Values are trimmed; blank strings and empty lists count as "not given".
- There is no prize field: no ASHWAMEDH 2026 event has prize information (Phase 7.6).

## 3. Registration, guidelines PDF and coordinators

**How registration actually works (Phase 7.6):** students read the event page (details, guidelines
PDF, coordinator); each department shortlists suitable students (about 2–5 per event), and only
shortlisted students complete the controlled Google Form. The site therefore shows, by default, the
guidelines PDF, the coordinator and a fixed "Registration process" note about departmental
shortlisting. It never implies an open public form.

Decisions D7-1 … D7-9 (`docs/requirements/decisions-log.md`). The checks live in `buildEvent()`
(`src/data/events/build.ts`) and `src/lib/safe-url.ts`.

```ts
hackathon: {
  source: { kind: "official-form", reference: "IT Hackathon 2026 registration", date: "2026-11-02" },
  registrationLink: "https://forms.gle/<official-id>",
  registrationDeadline: "<official wording>",
  status: "open",
  pdf: "/docs/IT_Hackathon_2026.pdf",
},
```

- **Optional, unknown = left out.** No form supplied → no `registrationLink`; the CTA shows
  "Registration Opening Soon" with the departmental-shortlisting note. Never enter a guessed, sample
  or test URL. A controlled (shortlisted-only) form may be recorded, but keep `status` at `"not-open"`.
- **Allowed links (D7-1):** `https://docs.google.com/forms/…` or `https://forms.gle/…` only — the link
  the organisers published, exactly. No `http://`, other hosts (including other link shorteners) or site paths.
- **`status`** is `"not-open"` (default), `"open"` or `"closed"`. There is no "Completed" state (D7-4).
- **Register Now appears only when `status: "open"` _and_ the link is valid (D7-3).** Set `"open"`
  only when the official source says the event is open for **public** registration. A valid link on its
  own does not open registration — the link can be entered early and the event stays "Opening Soon"
  until `status` is set to `"open"`. To close, set `status: "closed"` ("Registration Closed").
- **`registrationDeadline`** is free text in the official wording, shown under the CTA only while
  registration is open (D7-5). Nothing is parsed and nothing closes automatically — change `status`
  by hand.
- **`pdf` (D7-8):** an `https://` URL, or a file placed in `public/docs/` written as
  `/docs/<file>.pdf`. Use a URL-safe file name (letters, digits, `-`, `_`, `.` — no spaces). Missing →
  "Guidelines PDF Coming Soon".
- **Coordinators:** `coordinators` (name, phone, email) only as officially supplied; `phone` / `email`
  may be `null`. Missing → "Coordinator details will be announced."
- **Source (D7-6):** the entry's `source` covers the registration and PDF values too — e.g.
  `official-form` for a form the organisers shared, `owner-confirmed` if the owner sent the link.
- **Build guard (D7-2):** a disallowed `registrationLink` or `pdf`, or `status: "open"` without a valid
  link, fails `npm run build` (and the tests) with a message naming the event and field. Fix the data;
  do not work around the check.
- Values are trimmed; a blank value counts as not given (D7-9).
- Cultural Night has no registration (OD-14, D7-7).

## 4. When information is unknown

Leave the field out. Do not write `"TBA"`, `"Coming soon"`, `"-"` or a guess. The display layer
(`src/lib/display.ts`) turns missing values into the agreed wording:

| Missing                                                  | Shown                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| A chip value                                             | TBA                                                                     |
| About / Rules / Eligibility / Venue / Coordinator        | "…coming soon" / "…will be announced" sentence                          |
| Registration not open (no `status: "open"` + valid link) | "Registration Opening Soon" (disabled) + departmental-shortlisting note |
| PDF                                                      | "Guidelines PDF Coming Soon" (disabled)                                 |
| Image                                                    | Abstract vertical artwork                                               |

## 5. Renamed events — `legacySlugs`

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

## 6. Before you commit content

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. The tests check that every
details entry has a valid source, every key is a real slug, registration and PDF links pass the
D7 rules, and the 40 identities are unchanged.
