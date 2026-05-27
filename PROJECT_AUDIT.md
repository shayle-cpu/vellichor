# PROJECT_AUDIT

## Executive Summary
Vellichor is a single-page React reading tracker + social reading community app with Supabase as the primary backend. The codebase is feature-rich for an MVP (library shelves, reading calendar/streaks, achievements, social/friends, public profiles, predictions), but has production blockers: mixed backend paradigms (Supabase + legacy Firebase), auth route gating bug, missing operational hardening, and weak DevOps/SEO foundations.

---

## 1) Repository Inventory

### Architecture Map
- **Frontend:** Create React App + CRACO app (monolithic SPA).
- **Backend/data layer:** Supabase (Auth + Postgres + Realtime + likely Storage for avatars).
- **Legacy backend remnants:** Firebase/Firestore predictions path still in repo.
- **No custom backend API service:** direct client-to-Supabase queries throughout pages/components/contexts.

### Frontend/Backend/Services Breakdown
- **UI shell + routing:** `src/App.js` with mostly protected routes and a few public routes.
- **Authentication:** Supabase auth session in `AuthContext`, login/signup in `pages/Auth.js`, route guard in `components/ProtectedRoute.jsx`.
- **Domain state/services:**
  - Book shelf lifecycle + cloud sync: `context/BookContext.js`
  - Reading logs: `context/ReadingLogContext.js`
  - Achievements: `context/AchievementsContext.js` + `utils/achievementsUtils.js`
  - Social/friends: `api/friends.js`, `pages/Friends.js`, `pages/PeopleSearch.js`, `pages/Community.js`
- **Realtime features:** Supabase realtime channels used in Community and Predictions.
- **Public web pages for sharing:** `pages/PublicProfile.js`, `pages/PublicLibrary.js`.

### Frameworks/Libraries/Infra Dependencies
- **Framework/runtime:** React 19, React Router 7, CRA/react-scripts 5, CRACO.
- **BaaS/data/auth:** `@supabase/supabase-js`.
- **Legacy service SDK:** Firebase JS SDK + Firestore.
- **UI/UX libs:** react-icons, react-dnd.
- **Utilities/testing:** papaparse, testing-library stack, web-vitals.

### How the Application Works (Current Flow)
1. App bootstraps providers (`AuthProvider`, `BookProvider`, `ReadingLogProvider`, `AchievementsProvider`).
2. Supabase auth session resolves.
3. Protected routes should gate most app pages.
4. User manages books in shelf buckets (currently reading, TBR, finished, DNF), with local storage + Supabase sync.
5. Engagement features: reading streaks, calendar, challenges, achievements, stats.
6. Social: friend discovery + requests, community posts, public profile/library pages.
7. Predictions journaling via Supabase table; legacy Firebase predictions code remains but is not primary path.

---

## 2) Health Audit

### Broken/Incomplete/Deprecated/Dead Code
1. **Critical bug: auth guard mismatch.**
   - `ProtectedRoute` expects `loading` from auth context, but `AuthContext` provides `authReady`.
   - Effect: guard may misbehave and can render before auth status is known.
2. **Duplicate/conflicting predictions implementations.**
   - Active Supabase page in `src/pages/PredictionsPage.js`.
   - Legacy wrapper in `src/PredictionsPage.js` and legacy Firestore feature in `src/Predictions.js`.
   - Increases confusion, security surface, and maintenance burden.
3. **Hard-coded Firebase config committed to repo.**
   - API keys/config are exposed client-side by design, but mixed usage and stale credentials create risk and confusion.
4. **Lint warnings in production build** indicate maintainability issues and potential runtime edge bugs.

### Outdated Dependency & Upgrade Risks
- CRA/react-scripts architecture is increasingly legacy vs modern React toolchains (Vite/Next).
- `browserslist` DB is stale in build output.
- Mixed ESM/CRA compatibility complexity (`import.meta` fallback logic in a CRA app).

### Security Issues
- **Direct client access to Supabase tables** implies RLS correctness is critical; repo does not include migration/policy definitions for auditing.
- **No server-side boundary** for abuse-prone operations (post creation, profile search, friend requests) beyond DB policies.
- **Potential sensitive logging** via client error logs in production.
- **Legacy Firebase path** may bypass intended Supabase security model if accidentally wired.

### Performance Bottlenecks
- N+1 querying in community feed hydration (`posts` then per-post profile/book fetches).
- Potential high client-side state churn and optimistic update complexity in BookContext.
- No evidence of code-splitting/lazy routes for many heavy pages.

### SEO Issues
- App is a protected SPA with minimal public crawlable surface.
- No route-level metadata strategy (title/description/OpenGraph).
- Public pages exist but likely not SSR/prerendered.
- Default CRA `robots.txt`/manifest values and generic README indicate minimal SEO setup.

### Scalability Concerns
- Client-heavy Supabase querying from many pages without centralized data access abstraction.
- Realtime channels per feature can become costly at scale without careful subscription lifecycle and pagination.
- No backend worker pipeline for notifications/digests/recommendations.

### Missing Env Vars / Infra Assumptions
- Requires `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` (or Vite equivalents) at runtime.
- Implicit assumptions: Supabase tables (`books`, `profiles`, `posts`, `friendships`, `predictions`, etc.) and RLS policies already provisioned.
- No infra-as-code or SQL migrations in repo to recreate backend deterministically.

---

## 3) Product & Business Review

### What Product Is Trying to Be
A cozy, socially-aware reading OS for consumers:
- Personal reading management (shelves, progress, stats, goals/challenges).
- Community and friends around books.
- Public profile/library for discovery.
- Unique feature: in-book predictions journaling.

### Current UX/Onboarding/Retention Weaknesses
- Onboarding lacks guided “first-run” setup (import books, set goals, follow friends).
- Feature surface is broad, but value narrative is diffuse (library vs community vs predictions).
- Retention loops are weakly automated (no push/email digests, friend activity nudges).
- Information architecture likely dense for new users.

### Monetization Models (Realistic)
1. **Freemium subscription (highest control + recurring):**
   - Free: core shelves + basic stats.
   - Pro: advanced analytics, custom challenges, export/import, AI insights, deeper history.
2. **Affiliate commerce:**
   - Book buy links (Amazon/Bookshop.org/indie partners) on book/profile pages.
3. **Sponsored placements / contextual ads (lightweight):**
   - Optional in free tier community feed or discovery surfaces.
4. **Creator/Book-club tools:**
   - Paid group challenges, private circles, monthly discussion kits.

### Highest-ROI Improvements
- Stabilize auth/navigation + data consistency (trust baseline).
- Simplify product positioning around one “hero” loop (track → share → progress).
- Add measurable conversion funnel (signup → first book → day-7 retention).
- Introduce Pro tier with 2–3 differentiated capabilities quickly.

---

## 4) Technical Debt Analysis

### Critical
1. Fix auth guard/context mismatch.
2. Remove/retire legacy Firebase prediction path and duplicate page files.
3. Define and version Supabase schema + RLS policies in repo.
4. Add production observability/error tracking.

### Important
1. Refactor community feed to avoid N+1 fetches.
2. Introduce typed data contracts (TypeScript or Zod validation).
3. Build centralized data-access layer and query caching (TanStack Query).
4. Add CI checks (lint, test, typecheck, build).

### Nice-to-Have
1. Move from CRA to Vite/Next.
2. Introduce design system and accessibility pass.
3. Improve animation polish and empty-state storytelling.

### Quick Wins vs Major Refactors
- **Quick wins (1–5 days):** auth fix, lint cleanup, env docs, remove dead files, analytics instrumentation.
- **Major refactors (2–8 weeks):** architecture migration, robust backend governance, scalable feed/query design.

---

## 5) Modernization Recommendations

### Framework Upgrades
- Migrate from CRA/CRACO to **Vite** (fastest path) or **Next.js** (if SEO/public pages are strategic).
- Introduce TypeScript incrementally from context/services outward.

### Infrastructure Improvements
- Add Supabase migrations + seeds + policy files in-repo.
- Introduce environment management per stage (dev/staging/prod).
- Add backup/restore verification and incident runbooks.

### CI/CD Improvements
- GitHub Actions: lint, test, build, dependency audit, preview deploy.
- Protected branches with required checks.
- Automated semantic versioning/changelog.

### Analytics
- Product analytics (PostHog/Amplitude/Mixpanel): events for activation, retention, monetization.
- Session replay + error telemetry (Sentry).

### Auth/Security
- Verify and harden Supabase RLS for every table.
- Rate-limiting/abuse controls for social endpoints via Edge Functions or proxy layer.
- Enforce secure headers/CSP at hosting layer.

### SEO
- Public profile/library indexability strategy.
- Metadata system + structured data for books/profiles.
- Content hub/blog for discovery queries (reading lists, genre trends).

### Performance
- Route-level code splitting.
- Batched relational queries or SQL views for feed hydration.
- Image optimization (book covers, avatars).

---

## 6) Revenue Optimization Ideas

### Subscriptions
- **Vellichor Pro ($5–10/mo):** advanced insights, AI reading coach, unlimited exports, deep challenge analytics.
- **Annual plan discount** to improve cash flow and retention.

### Ads
- Non-intrusive sponsor cards in free community/discovery sections.
- Only after meaningful DAU/MAU to avoid harming early retention.

### Affiliate
- Book links with revenue share and UTM tracking.
- Personalized “buy next from TBR” cards.

### SEO Content Opportunities
- Genre/yearly challenge landing pages.
- Public reading stats templates users can share.
- “Best books for X challenge” editorial + community-curated lists.

### Automation Opportunities
- Weekly personalized digest emails (progress, friends, recommendations).
- Win-back campaigns for inactive users.

### AI Integrations
- AI-generated reading plans and pacing recommendations.
- Smart recap/prediction summarization from user notes.
- Auto-tagging posts/reviews for better discovery.

