# Decisions Log

Clarifications and corrections from the project owner. These take precedence over
[master-prompt-v1.md](./master-prompt-v1.md) where they conflict. Newest first.

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
