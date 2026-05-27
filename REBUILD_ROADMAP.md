# REBUILD_ROADMAP

## Roadmap Principles
- Sequence work by **risk reduction first**, then growth loops, then monetization scale.
- Every phase has explicit KPI outcomes.

## Phase 0 — Stabilize Foundations (Week 1)

| Task | Effort | Business Impact | Technical Risk | Dependencies |
|---|---:|---|---|---|
| Fix auth gating mismatch and route guard behavior | 0.5 day | Very high (unblocks core usage) | Low | None |
| Remove/retire duplicate Firebase predictions path | 0.5–1 day | High (reduces confusion/risk) | Low | None |
| Clean lint/build warnings | 0.5 day | Medium | Low | None |
| Create `.env.example` + runtime configuration docs | 0.5 day | High (onboarding/dev speed) | Low | None |
| Baseline error monitoring (Sentry) | 1 day | High | Medium | Deployment access |

**Exit criteria:** app can be built/deployed cleanly, auth is stable, and operational visibility exists.

## Phase 1 — Backend Governance & Reliability (Weeks 2–3)

| Task | Effort | Business Impact | Technical Risk | Dependencies |
|---|---:|---|---|---|
| Supabase schema migration scripts + seeds | 2–3 days | Very high | Medium | Phase 0 |
| RLS audit and policy hardening for all tables | 2–4 days | Very high | High | Migration baseline |
| Introduce staging environment + deploy pipeline | 2 days | High | Medium | CI setup |
| Add automated CI checks (lint/test/build/audit) | 1 day | High | Low | Repo access |

**Exit criteria:** reproducible backend and safer production posture.

## Phase 2 — Data Access & Performance (Weeks 4–5)

| Task | Effort | Business Impact | Technical Risk | Dependencies |
|---|---:|---|---|---|
| Refactor N+1 community feed queries using joins/views | 2–3 days | High | Medium | Phase 1 |
| Add client query caching layer (TanStack Query) | 3–5 days | High | Medium | Feed/data refactor |
| Add route-level code splitting/lazy loading | 1–2 days | Medium | Low | None |
| Image optimization/CDN strategy for covers/avatars | 1–2 days | Medium | Medium | Hosting config |

**Exit criteria:** better responsiveness and lower backend load.

## Phase 3 — Product Clarity & Retention Loop (Weeks 6–8)

| Task | Effort | Business Impact | Technical Risk | Dependencies |
|---|---:|---|---|---|
| Redesign onboarding (import + first goal + follow suggestions) | 1–2 weeks | Very high | Medium | Analytics baseline |
| Event instrumentation + funnel dashboards | 2–3 days | Very high | Low | Phase 0 monitoring |
| Weekly digest/email nudges automation | 3–5 days | High | Medium | Messaging provider |
| Habit loop enhancements (streak rescue, reminders, social prompts) | 4–7 days | High | Medium | Analytics insights |

**Exit criteria:** measurable uplift in activation and D7/D30 retention.

## Phase 4 — Monetization Launch (Weeks 9–12)

| Task | Effort | Business Impact | Technical Risk | Dependencies |
|---|---:|---|---|---|
| Launch Pro tier feature gates | 1–2 weeks | Very high | Medium | Phase 3 validated value |
| Payments integration (Stripe) + entitlement checks | 1 week | Very high | Medium | Pro feature definition |
| Affiliate links + attribution tracking | 2–4 days | Medium | Low | Book detail surfaces |
| Pricing page + lifecycle email automation | 3–5 days | High | Low | Analytics + payments |

**Exit criteria:** first recurring revenue with tracked conversion and churn signals.

## Phase 5 — SEO and Growth Engine (parallel after Phase 2)

| Task | Effort | Business Impact | Technical Risk | Dependencies |
|---|---:|---|---|---|
| Public page metadata/structured data | 3–5 days | High | Medium | Routing/public pages |
| Content hub for reading-related queries | 1–2 weeks | High | Medium | Editorial plan |
| Programmatic landing pages (genres/challenges) | 1–2 weeks | High | High | SEO infra |

**Exit criteria:** compounding organic acquisition channels.

