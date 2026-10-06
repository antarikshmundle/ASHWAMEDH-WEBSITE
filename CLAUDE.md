@AGENTS.md

# ASHWAMEDH 2026 — project rules

Spec: `docs/requirements/master-prompt-v1.md`. Owner corrections (take precedence): `docs/requirements/decisions-log.md`.

- Never invent official info (descriptions, dates, rules, fees, prizes, venues, coordinators, forms, PDFs, sponsors, contacts). Unknown = `null` in data → rendered as TBA / Coming Soon / Registration Opening Soon.
- Event inventory in master prompt §6 is the only source of events. Do not add events.
- Never label anything "Upcoming" (no dates). Schedule = "Schedule Releasing Soon".
- No stock photos posing as real Ashwamedh events — abstract/graphic placeholders only.
- Locked UI/UX reference image (`docs/ux/reference/`) is the visual source of truth. Do not redesign or add sections.
- Content lives in `src/data/`, never hardcoded in components. One reusable event-detail component.
- Work phase by phase; do not start a new phase without owner approval. Explain what/why/what changes (Hinglish) before major steps.
- Before finishing: `npm run lint`, `npm run test`, `npm run build`.
