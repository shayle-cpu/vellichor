# Foundational Design System + Migration Priorities

## Highest-impact migration order
1. **Homepage/Dashboard** (`src/pages/Home.js`, `src/styles/Home.css`) — nightly ritual hierarchy, emotional hero, and quick action rhythm.
2. **Library experience** (`src/pages/Bookshelf.js`, `src/styles/Bookshelf.css`, shelf/book components) — most repeated browsing surface.
3. **Reading flow components** (`BookModal`, `Calendar`, reading log prompts) — session capture and reflective cadence.

## Incremental rollout strategy
- Phase 1: Introduce global tokens + primitives and apply to top-level shells and cards.
- Phase 2: Normalize buttons/inputs/focus states to improve consistency and accessibility.
- Phase 3: Migrate route-by-route without changing data contracts or context APIs.

## Guardrails
- Preserve current routing and feature behavior while changing only presentation and layout primitives.
- Keep warm, literary visual language (no glassmorphism / harsh minimalism).
