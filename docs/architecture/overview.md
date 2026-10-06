# Architecture Overview

## Stack

- **Next.js 16 (App Router) + TypeScript (strict)** — all pages statically generated.
- **Tailwind CSS v4** — design tokens centralized in one CSS file (Phase 3).
- **Motion** + **Lucide React** — added when first used (Phase 5).
- **Vitest** for unit tests; Playwright for E2E/a11y later.
- No backend, auth, database or CMS until official requirements justify one.

## Principles

1. **Content ≠ presentation.** Event and festival data live in `src/data/`; components never hardcode content.
2. **Unknown = `null`.** Data never contains `"TBA"` strings or guessed values. A single helper in `src/lib/`
   maps missing values to the right placeholder ("TBA", "Coming Soon", "Registration Opening Soon").
3. **One event-detail component** renders every event page from data (`/events/[vertical]/[slug]`).
4. **Theming by tokens.** Verticals (Technomedh, Cultural, Sports, Cultural Night) override a small set
   of accent tokens via a `data-vertical` attribute — one brand, four personalities.
5. **Reference-first UI.** The locked image in `docs/ux/reference/` decides layout and composition.

## Planned routes

```
/                              Home
/events                        All verticals
/events/[vertical]             technomedh | cultural | sports
/events/[vertical]/[slug]      Event detail (data-driven)
/cultural-night
/schedule                      "Schedule Releasing Soon" until dates are official
/gallery
/campus-map
/team
/about
/contact
```

## Folder map

```
src/app/          Routes only — thin, compose sections
src/components/   ui/ navigation/ cards/ sections/ layout/
src/data/         Typed content (site identity, events, departments)
src/lib/          Pure helpers (site URL, placeholder display, metadata)
src/styles/       globals.css (+ tokens in Phase 3)
src/types/        Shared types
tests/unit/       Vitest
tests/e2e/        Playwright (later)
docs/             requirements/ architecture/ ux/ content/
```

## Configuration

| Variable               | Purpose                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Base URL for canonical/OG/sitemap. Falls back to `http://localhost:3000`. |
