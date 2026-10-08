# Decisions Log

Clarifications and corrections from the project owner. These take precedence over
[master-prompt-v1.md](./master-prompt-v1.md) where they conflict. Newest first.

## 2026-10-08 — Phase 7.6 (Official content / registration workflow correction)

Owner corrections after the Phase 7 checkpoint (8714fb1). They take precedence over master prompt §6 and
over the earlier entries below where they conflict.

| #      | Decision                                                                                                                                                                                                                                                                                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C7.6-1 | Actual registration workflow: Google Forms are not publicly open. Students read the event page (details, guidelines PDF, coordinator); each department/HOD shortlists about 2–5 students, who complete the controlled Google Form. The detail page shows a fixed "Registration process" note about departmental shortlisting while registration is not publicly open. |
| C7.6-2 | The primary CTA keeps "Registration Opening Soon" by default. "Register Now" still needs `status: "open"` plus a valid Google Form link (D7-1, D7-3), and `"open"` is set only when the official source says the event takes public registration. Phase 7 URL validation is unchanged.                                                                                |
| C7.6-3 | The event PDF is presented as the guidelines PDF: "View Guidelines PDF" / "Guidelines PDF Coming Soon" (rules unchanged, D7-8). Coordinator details only as officially supplied.                                                                                                                                                                                      |
| C7.6-4 | No ASHWAMEDH 2026 event has prize information: `prizePool` and `prizeDetails` are removed from the data model, the "Prize Pool" chip and the "Prizes" tab are removed from event detail (five chips, five tabs).                                                                                                                                                      |
| C7.6-5 | Sports adds **Tug of War** (`tug-of-war`, no department), last in the Sports order — 11 Sports events, 40 in total. No details are entered for it.                                                                                                                                                                                                                    |

## 2026-10-08 — Phase 7 (Registration Integration) — owner decisions

Approved after the Phase 7.1 registration architecture audit:

| #    | Decision                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| D7-1 | Registration links: HTTPS only, and only official Google Forms — `https://docs.google.com/forms/…` or `https://forms.gle/…`.             |
| D7-2 | Invalid or inconsistent registration data fails the build; the display layer also falls back defensively to "Registration Opening Soon". |
| D7-3 | Registration is open only when `status` is `"open"` **and** a valid registration link exists.                                            |
| D7-4 | No "Completed" state in Phase 7; conflicting documentation is corrected.                                                                 |
| D7-5 | Registration deadline is free text, shown only while registration is open; no automatic closing.                                         |
| D7-6 | Provenance stays the existing entry-level `ContentSource`; no separate registration source field.                                        |
| D7-7 | Cultural Night registration stays out of Phase 7 (OD-14).                                                                                |
| D7-8 | Event PDF links use the same safe-URL pattern: HTTPS URLs, or site paths under `/docs/` (files in `public/docs/`).                       |
| D7-9 | Registration and PDF values are trimmed; blank values become `null`.                                                                     |

Implementation notes:

| #   | Note                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `buildEvent()` validates registration and PDF data (`src/lib/safe-url.ts`): a disallowed `registrationLink` or `pdf`, or `status: "open"` without a valid link, fails the build. Supersedes Phase 6 note E4. |
| R2  | `registrationState()` / `pdfState()` re-check links before rendering; anything unsafe falls back to "Registration Opening Soon" / "Event PDF Coming Soon".                                                   |
| R3  | Listing pages pass only `{ slug, name }` to the client "Jump to event" menu, so registration and PDF data are never serialised into listing pages.                                                           |
| R4  | No registration URLs are in the data yet; `details.ts` stays empty until official forms arrive. Authoring rules: `docs/content/event-data.md` §3.                                                            |

## 2026-10-07 — Phase 6 (Event/Data Architecture)

Owner-approved decisions (P6-1 … P6-7, as recommended in the Phase 6 plan):

| #    | Decision                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P6-1 | The event key is an explicit `slug` (replaces the derived `id`).                                                                                                    |
| P6-2 | `eligibility` is a list of paragraphs (`string[]`), like `description`.                                                                                             |
| P6-3 | `participation` (`individual` / `team` / `individual-or-team`) is an explicit field, stated by the official source. It is never derived from the team-size wording. |
| P6-4 | Every official details entry records its source (`ContentSource`: kind, reference, date). Enforced by type, at compile time and at build time.                      |
| P6-5 | Legacy-slug redirect mechanism is implemented now with zero entries; a former slug is added only after an official rename.                                          |
| P6-6 | Dates and times stay free-text official wording; structured dates wait for the official schedule.                                                                   |
| P6-7 | No schedule day tabs (`scheduleDays`) in Phase 6 — no UI without official data.                                                                                     |

Implementation notes:

| #   | Note                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Event data lives in `src/data/events/`: `inventory.ts` (39 frozen identities, explicit slugs, fixed order), `details.ts` (official details by slug — empty), `build.ts` (`buildEvent()`), `slugs.ts` (slug index and redirects), `index.ts` (public API, import path `@/data/events`). |
| E2  | All 39 slugs equal the slug rule applied to the official names (unchanged URLs). A frozen snapshot test locks slug, name, vertical, department and order.                                                                                                                              |
| E3  | `prize` split into `prizePool` (Prize Pool chip) and `prizeDetails` (Prizes tab); `coordinator` renamed `coordinators`. The UI reads `EventRecord`; the old `FestEvent` type is removed.                                                                                               |
| E4  | Registration fields (`registrationLink`, `registrationDeadline`, `status`) pass through unchanged and are not validated — Phase 7.                                                                                                                                                     |
| E5  | Redirects: a former slug is prerendered and answers **308** with `location: /events/<slug>` (verified on `next start`). The static HTML also carries Next's client-side redirect marker for static hosting. Re-verify on the final host once hosting is decided (D6).                  |
| E6  | Authoring guide: [docs/content/event-data.md](../content/event-data.md).                                                                                                                                                                                                               |

## 2026-10-07 — Phase 4 (High-fidelity UI) — implementation notes, pending review

| #   | Note                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Tokens implemented centrally in `src/styles/tokens.css` (Tailwind v4 `@theme`); context accent via `data-vertical`.                                                                                                                                                                                                                                                                                                   |
| I2  | DS-05: `public/logos/ashwamedh-logo-trimmed.png` created by removing only alpha = 0 pixels (450 × 450 → 406 × 197; verified 0 non-transparent pixels removed, 0 pixel mismatches). Original file unchanged.                                                                                                                                                                                                           |
| I3  | DS-06: the Ashwamedh logo is never rendered wider than 203 CSS px; the hero reserves the reference logo area. Logos are served `unoptimized` (no server-side resizing).                                                                                                                                                                                                                                               |
| I4  | App icon `src/app/icon.png` is a byte-identical copy of the original Ashwamedh logo.                                                                                                                                                                                                                                                                                                                                  |
| I5  | Motion uses CSS only (hero entrance once, hover/focus, logo crossfade, menu, tab indicator); no Motion library dependency was needed.                                                                                                                                                                                                                                                                                 |
| I6  | Only new runtime dependency: `lucide-react` (icons).                                                                                                                                                                                                                                                                                                                                                                  |
| I7  | Visual review fixes (owner-approved): desktop navbar from 1280 px (`xl`) instead of 1024 px; varied hero skyline with grounded window lights; schedule in a surface panel with "Releasing Soon" in brand accent; stronger Cultural Night title tint and beams; calmer plan-view venue map (dot grid + contour rings, no geography); more event-art variety; quieter listing header motif; brighter Cultural card art. |

## 2026-10-06 — Phase 3 owner decisions (DS-01 … DS-08)

Full wording: [docs/design-system/owner-review.md](../design-system/owner-review.md).

| ID    | Status              | Decision                                                                                                                                                                                                                                      |
| ----- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DS-01 | LOCKED              | Rajdhani + Inter                                                                                                                                                                                                                              |
| DS-02 | PROVISIONAL         | Ember `#F08A3C` is a provisional, reference-derived accent, not the official brand colour                                                                                                                                                     |
| DS-03 | LOCKED (functional) | Four vertical accents kept for differentiation; may be superseded by official 2026 branding                                                                                                                                                   |
| DS-04 | LOCKED              | PCE logo completely unmodified; light plate approved                                                                                                                                                                                          |
| DS-05 | APPROVED            | Transparent whitespace around the Ashwamedh logo may be trimmed; artwork never altered                                                                                                                                                        |
| DS-06 | REQUIRED DEPENDENCY | No upscaling, tracing, vectorising or artificial enlargement; official high-res logo (SVG preferred) required for the final large hero logo. Phase 4 is not blocked: current logo usable within native sharpness limits (≤ 203 CSS px on 2×). |
| DS-07 | LOCKED              | Field-based multi-colour chip system (three tokenised tones), following the reference                                                                                                                                                         |
| DS-08 | LOCKED              | Hero side word stacks hidden on mobile                                                                                                                                                                                                        |

Standing rule: the reference image is not simplified for system consistency when it uses intentional variation.

**Phase 3 is LOCKED (2026-10-06).**

## 2026-10-06 — Phase 3 (Design System) — documentation (locked)

| #   | Decision                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Design system documented in [docs/design-system/](../design-system/README.md); implemented in Phase 5 as one central token file.              |
| S2  | Palette measured from the locked reference image, **not** derived from the Ashwamedh logo. Brand accent (ember) is provisional and swappable. |
| S3  | Context-accent model: components use `accent.*`, resolving to brand globally or to the vertical via `data-vertical`.                          |
| S4  | Text on accent fills is always dark (white fails contrast on every accent).                                                                   |
| S5  | Owner decisions DS-01 … DS-08 — see above.                                                                                                    |

## 2026-10-06 — Phase 2 owner decisions LOCKED

All 16 decisions (OD-01 … OD-16) are locked and authoritative. Full wording: [docs/ux/owner-decisions.md](../ux/owner-decisions.md).

| ID    | Locked decision (summary)                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| OD-01 | Official name "Business Ideathon"                                                                                                  |
| OD-02 | Official name "Project Competition"                                                                                                |
| OD-03 | Hackathon description / team format stay `null` / Coming Soon                                                                      |
| OD-04 | Schedule day count TBA; no day tabs                                                                                                |
| OD-05 | Schedule venues TBA; reference venue names never used                                                                              |
| OD-06 | Abstract map allowed; no invented pins, locations, labels or legend                                                                |
| OD-07 | Reference taglines are not official copy; copy areas stay placeholders / Coming Soon                                               |
| OD-08 | Social icons hidden until official handles                                                                                         |
| OD-09 | Gallery and Team kept in navbar; Coming Soon pages                                                                                 |
| OD-10 | Campus Map not a navbar item; `/venue` is the access point                                                                         |
| OD-11 | Homepage keeps Schedule, Cultural Night and Venue previews                                                                         |
| OD-12 | "Coming Soon" CTA non-clickable / disabled until official launch info                                                              |
| OD-13 | Logo transition approved: PCE (hero) → Ashwamedh (sticky / inner pages); logos unmodified                                          |
| OD-14 | Cultural Night "What's On": Group Dance, Singing, Solo Dance, Inauguration / Stage Performances; no public registration by default |
| OD-15 | "Events" = plain link to `/events`, no dropdown                                                                                    |
| OD-16 | Listing cards show department                                                                                                      |

OD-12 clarification (locked): the hero "Coming Soon →" follows the same rule as the navbar "Coming Soon". Both are
disabled and non-clickable, "Scroll to explore" stays functional, and there are no fake redirects or placeholder
destinations.

**Phase 2 is LOCKED (2026-10-06).**

## 2026-10-06 — Phase 2 (UX / IA) documentation

| #   | Decision                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Reference image stored as `docs/ux/reference/ashwamedh-final-ui-reference.jpg` (renamed from `.png.jpg`; it is a JPEG). D1 resolved.                                                                          |
| P2  | Reference image = source of truth for UX structure and visual hierarchy only, **not** for official content.                                                                                                   |
| P3  | Routes: `/`, `/events`, `/technomedh`, `/cultural`, `/sports`, `/events/[slug]`, `/cultural-night`, `/schedule`, `/venue`, `/gallery`, `/team`, `/about`, `/contact`. Supersedes `/events/[vertical]/[slug]`. |
| P4  | Placeholder vocabulary limited to TBA (facts), Coming Soon (content blocks), Registration Opening Soon (registration CTA only).                                                                               |
| P5  | Owner decisions OD-01 … OD-16 — locked, see above.                                                                                                                                                            |

## 2026-10-06 — Pre-Phase 0 corrections

| #   | Decision                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The locked UI/UX reference image is the visual source of truth. It must be stored at `docs/ux/reference/` so it is available to every contributor and tool. **Status: not yet in the repository.**                |
| D2  | No generic or invented event descriptions. Until official information arrives, `description` and every other unavailable field stays `null` and renders as an appropriate TBA / Coming Soon state.                |
| D3  | No AI & DS Technomedh event. The provided event inventory is the source of truth; an official update may add one later.                                                                                           |
| D4  | Event dates are not finalized, so nothing is labelled "Upcoming". Use "Featured Events" only if needed, with currently known official event names only. Schedule shows "Schedule Releasing Soon".                 |
| D5  | No stock photography presented as real Ashwamedh events. Until official imagery arrives, only intentional abstract/graphic placeholders are used.                                                                 |
| D6  | `NEXT_PUBLIC_SITE_URL` stays configurable; hosting and domain are not decided.                                                                                                                                    |
| D7  | The "7 homepage sections" list is not an absolute rule. The locked reference image and its composition are the source of truth: no unnecessary sections, but no distorting the design to satisfy a section count. |

## 2026-10-06 — Phase 0 technical decisions

| #   | Decision                                                                                                   | Reason                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Next.js 16 App Router, all pages statically generated                                                      | Fast, SEO-friendly, no server needed for current scope.                                                                                              |
| T2  | Tailwind CSS v4 with tokens in one CSS file (Phase 3)                                                      | Branding is not final; rebrand must be a one-file change.                                                                                            |
| T3  | Unknown content is `null` in data, never a `"TBA"` string                                                  | One display helper decides the placeholder wording; data can never contain fake values.                                                              |
| T4  | `@types/node` pinned to v24                                                                                | Matches the Node 24 runtime; required by Vitest 5.                                                                                                   |
| T5  | `motion` and `lucide-react` installed when first used (Phase 5)                                            | No unused dependencies.                                                                                                                              |
| T6  | Testing Library / jsdom / Playwright added when component and E2E tests begin                              | Phase 0 only tests pure TypeScript helpers.                                                                                                          |
| T7  | `npm audit` reports 5 high-severity issues in the ESLint dev toolchain (`braces` via `eslint-config-next`) | Dev-only, not shipped to users. `npm audit fix --force` would downgrade to Next 14, so it is not applied; revisit when `eslint-config-next` updates. |
