# ASHWAMEDH 2026

Official website of **ASHWAMEDH 2026** — the flagship annual college festival of
**Priyadarshini College of Engineering (PCE), Nagpur**.

> Status: **Phase 2 locked · Phase 3 Design System locked.** No UI has been implemented yet.

## Requirements

- Node.js 24 (see `.nvmrc`; minimum 20.9)
- npm

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; see Environment below
npm run dev                  # http://localhost:3000
```

## Scripts

| Script                            | What it does                            |
| --------------------------------- | --------------------------------------- |
| `npm run dev`                     | Start the dev server                    |
| `npm run build`                   | Production build                        |
| `npm run start`                   | Serve the production build              |
| `npm run lint` / `lint:fix`       | ESLint                                  |
| `npm run typecheck`               | TypeScript (strict)                     |
| `npm run format` / `format:check` | Prettier (with Tailwind class sorting)  |
| `npm run test` / `test:watch`     | Vitest                                  |
| `npm run check`                   | typecheck + lint + format check + tests |

## Environment

| Variable               | Required | Description                                                                                               |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | No       | Public base URL (no trailing slash). Defaults to `http://localhost:3000`. Hosting/domain not yet decided. |

Never commit `.env.local` or any secrets.

## Project structure

```
docs/            requirements, architecture, UX reference, official content status
public/          images, icons, logos, fonts
src/app/         routes (App Router)
src/components/  ui, navigation, cards, sections, layout
src/data/        typed content — the only place content lives
src/lib/         pure helpers
src/styles/      global styles and design tokens
src/types/       shared types
tests/           unit (Vitest) and e2e
```

## Key documents

- [Master project prompt](docs/requirements/master-prompt-v1.md) — full specification
- [Decisions log](docs/requirements/decisions-log.md) — owner corrections (take precedence)
- [Architecture overview](docs/architecture/overview.md)
- [UX / information architecture (Phase 2)](docs/ux/README.md) — sitemap, navigation, flows, states
- [Owner decisions register](docs/ux/owner-decisions.md)
- [Design system (Phase 3)](docs/design-system/README.md) — colours, type, layout, components, logos, motion
- [Official content status](docs/content/README.md)
- [Locked UI/UX reference](docs/ux/reference/ashwamedh-final-ui-reference.jpg)

## Content rules

Official information (dates, rules, fees, prizes, venues, coordinators, forms, sponsors, descriptions)
is **not yet released**. Never invent it. Unknown values are `null` in data and render as
TBA / Coming Soon / Registration Opening Soon.

## Git workflow

- `main` — production-ready, locked phases only
- `develop` — integration branch
- `feature/<name>` — e.g. `feature/homepage`, `feature/events`; branch from and merge back into `develop`

Workflow per phase: **Plan → Implement → Test → Review → Lock → Next phase.**
