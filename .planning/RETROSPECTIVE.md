# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-26
**Phases:** 8 | **Plans:** 16 | **Timeline:** 12 days (2026-03-14 → 2026-03-26)

### What Was Built

- Vue 3 + TypeScript SPA on Cloudflare Pages — full app shell, GitHub OAuth popup, Pinia stores, shadcn-vue component system
- Complete prompt lifecycle — infinite-scroll browse with MiniSearch (<50ms), split-pane editor with image upload and auto-save, non-destructive version history with diff view
- Community layer — reactions (👍❤️🚀 with optimistic UI), comments, user profiles, bookmarks, flagging via GraphQL mutations
- Admin moderation panel — queue management, label CRUD, action log, stats overview, bulk actions
- PWA — offline browse via service worker cache, write queue drained on reconnect
- ETag caching — localStorage LRU per-user cache wired into Octokit; 304s cost zero rate-limit quota
- Gap closure phases (5–8) fixed: fetchCurrentUser stub, ProfileRedirectView race condition, ⌘K command palette wiring, admin sidebar maintainer gating, admin log stale invalidation

### What Worked

- **Structured phase planning** — each phase had a clear goal, requirements list, and success criteria; no ambiguity about "done"
- **TDD wave 0 stubs** — writing failing test stubs before implementation caught integration issues early (e.g., ToggleInput snapshot pattern in useReactions)
- **Audit-driven gap closure** — milestone audit exposed 4 critical gaps; 4 phases (5–8) closed them systematically without rework
- **Phased ETag strategy** — deferring ETag integration to Phase 7 was correct; the foundation (etagFetchWrapper in lib) was laid in Phase 2 and simply wired in Phase 7
- **Cloudflare free tier stack** — no infrastructure cost surprises; Pages + Workers + R2 held at 50–400 users as designed

### What Was Inefficient

- **VALIDATION.md nyquist frontmatter never updated** — wave 0 tests ran in each phase but `nyquist_compliant` and `wave_0_complete` flags were never written back; future milestones should include a validation update step in each plan
- **Audit predated Phase 8** — the `v1.0-MILESTONE-AUDIT.md` was written at `tech_debt` status but Phase 8 closed all 3 integration items; audit status field not updated post-closure
- **`02-03-SUMMARY.md` missing `requirements_completed`** — VERS-02–05 were not listed in frontmatter despite being implemented; caused unnecessary manual re-verification during audit
- **Human verification deferred** — phases 4–7 accumulated "human verification pending" items for live OAuth, admin panel, PWA caching; these require a real browser session and were never cleared

### Patterns Established

- **TDD red-green cycle on composable specs** — extend assertion first, add minimal source to pass; avoids over-implementation
- **ToggleInput snapshot pattern** — read optimistic state before `mutateAsync` so `mutationFn` receives pre-flip snapshot (critical for reaction toggle correctness)
- **`initMarkdown()` async singleton** — called in `App.vue onMounted`, `markdownReady` flag guards rendering; prevents FCP blocking
- **`suppressDirty` + `nextTick` reset in stores** — prevents watch-triggered isDirty bounce on bulk field updates
- **`invalidateAdmin()` centralizes all 3 cache keys** — all mutations benefit from single invalidation call; add new query keys here when extending admin
- **CSRF state in Worker closure (not sessionStorage)** — sessionStorage not shared between opener and OAuth popup; closure is the correct pattern

### Key Lessons

1. **Run the audit before planning gap-closure phases** — the audit exposed 4 critical gaps that required 4 additional phases; earlier auditing would have surfaced these before Phase 4 shipped
2. **Write VALIDATION.md frontmatter updates into each plan** — nyquist compliance is only tracked if the metadata is written back; add a `Update VALIDATION.md frontmatter` task to every plan template
3. **`makeBoundFetch` closure pattern is reusable** — any future REST client that needs per-user cache scoping can adopt the same pattern: capture `userLogin` at construction, derive `cacheKey` from URL pathname
4. **Phased API contracts matter** — `getIssueComments` adding the optional `userLogin` param in Phase 7 meant Phase 8 could call it correctly with zero refactoring; design REST helpers to be extensible from the start

### Cost Observations

- Model: Claude Sonnet 4.6 (balanced profile throughout)
- Sessions: ~8 (one per phase, some phases combined)
- Notable: 16 plans across 8 phases executed in 12 days with no architectural rework; ETag and auth patterns established in early phases composed cleanly into later phases

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 | 16 | Initial MVP — established all baseline patterns |

### Cumulative Quality

| Milestone | LOC | Files | Requirements |
|-----------|-----|-------|--------------|
| v1.0 | 12,271 | 605 | 64/64 satisfied |

### Top Lessons (Verified Across Milestones)

1. Audit before milestone complete — gaps are cheaper to close when found early
2. Write VALIDATION.md frontmatter in each plan — compliance is only real if metadata reflects it
