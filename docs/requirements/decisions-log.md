# Decisions Log

Clarifications and corrections from the project owner. These take precedence over
[master-prompt-v1.md](./master-prompt-v1.md) where they conflict. Newest first.

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
