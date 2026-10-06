@AGENTS.md

# ASHWAMEDH 2026 — project rules

Spec: `docs/requirements/master-prompt-v1.md`. Owner corrections (take precedence): `docs/requirements/decisions-log.md`.

- Never invent official info (descriptions, dates, rules, fees, prizes, venues, coordinators, forms, PDFs, sponsors, contacts). Unknown = `null` in data → rendered as TBA / Coming Soon / Registration Opening Soon.
- Event inventory in master prompt §6 is the only source of events. Do not add events.
- Never label anything "Upcoming" (no dates). Schedule = "Schedule Releasing Soon".
- No stock photos posing as real Ashwamedh events — abstract/graphic placeholders only.
- Locked UI/UX reference `docs/ux/reference/ashwamedh-final-ui-reference.jpg` is the source of truth for UX/visual structure, NOT for content. Do not redesign or add sections.
- UX/IA spec: `docs/ux/` (Phase 2). Open owner decisions: `docs/ux/owner-decisions.md` — follow their interim behaviour until decided.
- Content lives in `src/data/`, never hardcoded in components. One reusable event-detail component.
- Work phase by phase; do not start a new phase without owner approval. Explain what/why/what changes (Hinglish) before major steps.
- Design system: `docs/design-system/`. Components use context accent tokens (`accent.*`), never hard-coded vertical colours. Logos unmodified; PCE logo always on a light plate; never upscale/trace/enlarge the current Ashwamedh logo; use it only ≤ 203 CSS px until the official high-res asset arrives (DS-06). Event-detail chips use the fixed multi-colour chip palette (DS-07).
- Before finishing: `npm run lint`, `npm run test`, `npm run build`.
