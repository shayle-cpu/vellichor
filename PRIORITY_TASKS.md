# PRIORITY_TASKS

## Prioritization Matrix

### Critical (Do First)

1. **Fix auth loading contract (`authReady` vs `loading`)**
   - Effort: 0.5 day
   - Business impact: Prevents user lockout/misrouting.
   - Technical risk: Low.
   - Depends on: None.

2. **Remove legacy Firebase prediction flow and duplicate page artifacts**
   - Effort: 0.5–1 day
   - Business impact: Reduces bugs/security confusion and engineering overhead.
   - Technical risk: Low.
   - Depends on: Route verification.

3. **Codify Supabase schema + RLS policies in version-controlled migrations**
   - Effort: 3–6 days
   - Business impact: Prevents data/security incidents and drift.
   - Technical risk: High (policy mistakes can break app access).
   - Depends on: Supabase project access.

4. **Add production monitoring + alerting**
   - Effort: 1–2 days
   - Business impact: Faster incident response, lower churn.
   - Technical risk: Low.
   - Depends on: Deployment pipeline.

---

### Important (Next)

5. **Refactor Community feed data loading to avoid N+1 queries**
   - Effort: 2–3 days
   - Business impact: Better performance and scalability.
   - Technical risk: Medium.
   - Depends on: Schema understanding.

6. **Implement CI/CD quality gates**
   - Effort: 1–2 days
   - Business impact: Fewer regressions; faster team velocity.
   - Technical risk: Low.
   - Depends on: Repo/workflow permissions.

7. **Instrument product analytics events and funnels**
   - Effort: 2–4 days
   - Business impact: Enables data-driven retention and monetization decisions.
   - Technical risk: Low.
   - Depends on: Event taxonomy.

8. **Onboarding overhaul (first-run activation path)**
   - Effort: 1–2 weeks
   - Business impact: Major conversion and retention lift.
   - Technical risk: Medium.
   - Depends on: Analytics baseline.

---

### Nice-to-Have (After Stability + Growth)

9. **Migrate from CRA/CRACO to Vite or Next.js**
   - Effort: 1–3 weeks
   - Business impact: Long-term dev speed and performance.
   - Technical risk: Medium-high.
   - Depends on: Stabilized test coverage.

10. **TypeScript migration and API contract hardening**
   - Effort: 2–6 weeks incremental
   - Business impact: Lower bug rate, safer iteration.
   - Technical risk: Medium.
   - Depends on: Tooling alignment.

11. **Advanced SEO growth engine (content + programmatic pages)**
   - Effort: 2–6 weeks
   - Business impact: High long-term acquisition.
   - Technical risk: Medium-high.
   - Depends on: public content architecture.

---

## Quick Wins (This Week)
- Fix auth guard mismatch.
- Delete/archive legacy Firebase predictions code path.
- Resolve current lint warnings.
- Add `.env.example` and setup guide.
- Add minimal analytics and error tracking bootstrap.

## Major Refactors (Plan Carefully)
- Data layer standardization (query caching + domain services).
- Backend policy/versioning discipline with Supabase migrations.
- Framework migration for SEO/performance strategy.

