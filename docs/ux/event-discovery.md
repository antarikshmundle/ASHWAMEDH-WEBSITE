# Event Discovery, Listing, Detail and Registration

Covers Phase 2 items **5 (vertical discovery)**, **6 (event listing)**, **7 (event detail)** and
**8 (registration flow)**.
Tags: **[A]** reference · **[B]** confirmed · **[C]** TBA · **[OD-xx]** locked owner decision ([owner-decisions.md](owner-decisions.md)) · **[E]** dependency.

## 5. Four-vertical discovery flow

```
Home ─┬─ hero "Scroll to explore" ──► Events overview (H2 on Home)
      └─ nav "Events" ──────────────► /events  (same four cards)

Events overview
  ├─ Technomedh card ──► /technomedh ─┐
  ├─ Cultural card ────► /cultural ───┼─► Event listing ──► /events/[slug] ──► guidelines + coordinator ──► departmental shortlisting (§8)
  ├─ Sports card ──────► /sports ─────┘
  └─ Cultural Night ───► /cultural-night  (showcase + "What's On"; no listing, no registration — OD-14)
```

- Cultural Night is a vertical in the overview but **not** an event listing. Its page shows a "What's On"
  section with only the confirmed components: Group Dance · Singing · Solo Dance · Inauguration / Stage
  Performances. These have **no individual event pages and no public registration**. Registration is added
  only if organisers provide an official process/form (OD-14).
- Each vertical keeps the same page structure; only its visual personality changes (Phase 3 tokens).

## 6. Event listing structure (reference panel 04)

```
┌────────────────────┬────────────────────────────────────────────────────────┐
│ TECHNOMEDH         │                 TECHNOMEDH  (h1)                       │
│                    │                 [tagline area — OD-07]                 │
│ ▸ All Events       │  ┌────────┐  ┌────────┐  ┌────────┐                    │
│   Hackathon        │  │ image  │  │ image  │  │ image  │                    │
│   Robo-Craft       │  │ Name   │  │ Name   │  │ Name   │                    │
│   Rocketry         │  │ Dept.  │  │ Dept.  │  │ Dept.  │                    │
│                    │  │ meta   │  │ meta   │  │ meta   │                    │
│   …                │  │[View ▸]│  │[View ▸]│  │[View ▸]│   …                │
│                    │  └────────┘  └────────┘  └────────┘                    │
└────────────────────┴────────────────────────────────────────────────────────┘
```

| Element              | Behaviour                                                                                                | Status |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Sidebar title        | Vertical name                                                                                            | [A]    |
| Sidebar "All Events" | Current view (active)                                                                                    | [A]    |
| Sidebar event list   | Every event of the vertical, linking straight to its detail page (quick jump; no single-event filtering) | [A]    |
| Page heading         | Vertical name as `h1`                                                                                    | [A]    |
| Tagline area         | Placeholder copy area (reference text "Engineer today. Shape tomorrow." not used)                        | OD-07  |
| Grid                 | 3 columns desktop; **all** events of the vertical, no pagination (max 15)                                | [A]    |
| Order                | Inventory order (master prompt §6) until the owner specifies otherwise                                   | [B]    |

**Event card fields**

| Slot             | Field                                                                            | Shown now                                                  |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Image            | `image`                                                                          | Abstract vertical placeholder (D5)                         |
| Title            | `name`                                                                           | Official name [B]                                          |
| Department       | `department`                                                                     | Confirmed department [B] (OD-16); line omitted for Sports  |
| Meta line, left  | participation type derived from `teamSize` (Individual / Team / Individual/Team) | **TBA** (the reference's "Team Event" is not used — OD-03) |
| Meta line, right | `date`                                                                           | **TBA**                                                    |
| Action           | "View Details →" → `/events/[slug]`                                              | [A]                                                        |

- The whole card is a link; "View Details" is its visible label (one link per card, not two).
- Reference card names "Ideathon" and "Project Exhibition" are **not** used — official names "Business
  Ideathon" and "Project Competition" apply (OD-01, OD-02).
- Sports cards: `department` is `null` because sports are not department events, so the department line is
  omitted. Everything else is identical.
- The department line is the one approved addition to the reference card (OD-16).

## 7. Event detail structure (reference panel 05)

```
← Back to Technomedh
┌──────────────────────────────────────┬──────────────────────────────┐
│ HACKATHON  (h1)                      │                              │
│ Information Technology  (department) │        event image           │
│                                      │                              │
│ [Participation] [Fee]  [Date & Time] │                              │
│ [Venue]         [Team size]          │                              │
│                                      │                              │
│ [ Registration Opening Soon ]  [ View Guidelines PDF ⤓ ]            │
│ Registration process: departmental shortlisting note                │
└──────────────────────────────────────┴──────────────────────────────┘
 About | Rules | Eligibility | Venue | Coordinator
 ─────────────────────────────────────────────────────────────
 tab content
```

### Field placement

Field names follow the Phase 6 data model (`EventRecord`, see [../content/event-data.md](../content/event-data.md)).

| Field                  | Where it appears                                                                                                     | Display when `null`                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `slug`                 | URL slug (explicit, frozen in the inventory), internal key                                                           | — (always present)                                     |
| `name`                 | `h1`; card title; sidebar; page `<title>`                                                                            | — (always present)                                     |
| `category`             | "Back to {Vertical}" link; nav active state; vertical theme                                                          | — (always present)                                     |
| `department`           | Line under the title (the slot the reference uses for "Code · Collaborate · Create") and listing card (OD-07, OD-16) | Line omitted (Sports)                                  |
| `description`          | **About** tab — one paragraph per item                                                                               | "Details coming soon."                                 |
| `image`                | Hero image (right) and listing card                                                                                  | Abstract vertical placeholder                          |
| `participation`        | Chip "Participation" and listing card meta — stated by the official source, never derived from `teamSize` (P6-3)     | TBA                                                    |
| `teamSize`             | Chip "Team Size" (official wording)                                                                                  | TBA                                                    |
| `registrationFee`      | Chip "Registration Fee"                                                                                              | TBA                                                    |
| `date`, `time`         | Chip "Date & Time" (combined)                                                                                        | TBA                                                    |
| `venue`                | Chip "Venue" + **Venue** tab (with link to `/venue`)                                                                 | Chip: TBA · Tab: "Venue will be announced."            |
| `rules`                | **Rules** tab                                                                                                        | "Rules will be published with the official event PDF." |
| `eligibility`          | **Eligibility** tab — one paragraph per item                                                                         | "Eligibility details coming soon."                     |
| `coordinators`         | **Coordinator** tab                                                                                                  | "Coordinator details will be announced."               |
| `registrationDeadline` | Small line under the CTA row, **only while registration is open**                                                    | Hidden (CTA already says "Registration Opening Soon")  |
| `registrationLink`     | "Register Now" (primary CTA) — official Google Form, active only with `status` `"open"` (D7-1, D7-3)                 | CTA disabled: "Registration Opening Soon"              |
| `pdf`                  | "View Guidelines PDF" (secondary CTA) — `https://` URL or `/docs/…` file (D7-8)                                      | CTA disabled: "Guidelines PDF Coming Soon"             |
| `status`               | `not-open` / `open` / `closed` — drives the CTA state; no "Completed" state (D7-4)                                   | Treated as not yet open                                |

Rules:

- **All five chips and all five tabs always render**, showing TBA / Coming Soon in place — this preserves the
  reference layout and tells visitors the information is expected, not missing. [A]
- The reference's Hackathon description ("A 24-hour coding challenge…") and "Team Event" chip are
  placeholder copy and are **not** used (OD-03, D2).
- Tabs are deep-linkable (e.g. `/events/hackathon#rules`) so coordinators can share a direct link to rules.
- No related-events strip, share widget or comments (not in reference).

## 8. Registration user flow

Actual ASHWAMEDH 2026 workflow (owner, Phase 7.6): 4000+ students across 14 departments, so Google
Forms are **not** publicly open. A student reads the event page — details, guidelines PDF, coordinator —
then the department (HOD) shortlists about 2–5 suitable students, and only they complete the
controlled Google Form.

```
Event detail
   │
   ├─ registration not open ──► "Registration Opening Soon" (disabled)
   │  (default)                  + note: participation is subject to departmental shortlisting;
   │                               contact your department or the event coordinator
   │
   ├─ registration open ──────► "Register Now →" ──► official Google Form (new tab, external-link icon)
   │                                                    └─ Google handles submission & confirmation
   │
   └─ registration closed ────► "Registration Closed" (disabled)
```

- No custom form, login, account, payment or backend. Fees (if any) are handled as the official
  form/PDF instructs.
- "Register Now" exists **only** on event detail pages — never on cards, listings or the homepage
  (keeps one clear path: read details → register).
- The site never stores registration data.
- `status` values: `not-open` (default) · `open` · `closed` — one per CTA state above. There is no
  "Completed" state (D7-4).
- "Register Now" shows only when `status` is `"open"` **and** the official Google Form link is valid
  (D7-1, D7-3) — set `"open"` only when the official source says the event takes **public** registration. Adding a link alone does not open registration; the deadline (free text) shows only
  while open, and nothing closes automatically (D7-5). Invalid registration data fails the build (D7-2).
- Dependency [E]: official Google Form URL per event. Authoring rules: `docs/content/event-data.md` §3.
