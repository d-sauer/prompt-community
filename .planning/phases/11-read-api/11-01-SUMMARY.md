---
phase: 11-read-api
plan: 01
subsystem: testing
tags: [vitest, cloudflare-workers, hono, tdd, red-phase, d1, jwt]

# Dependency graph
requires:
  - phase: 10-auth-migration
    provides: auth middleware (requireAuth, optionalAuth), test-setup pattern, JWT cookie session
  - phase: 09-backend-foundation
    provides: Hono app scaffolding, D1 schema + migrations, seed data with hardcoded IDs, vitest workerd config
provides:
  - Failing test contracts for all 12 Phase 11 read requirements (API-01..10, SEARCH-01, SEARCH-02)
  - prompts.spec.ts — 17 tests for GET /prompts, /prompts/:id, /versions, /comments
  - users.spec.ts — 9 tests for GET /users/:login, /prompts, /activity
  - search.spec.ts — 6 tests for GET /search (FTS5 validation, shape contract)
  - notifications.spec.ts — 3 tests for GET /notifications (requireAuth tier)
affects: [11-read-api plan-02 through plan-N, 13-frontend-rewire]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED phase: spec files created before implementation — all tests fail against 501/404 stubs
    - cloudflare:test + workerd runtime: no D1 mocking, migrations applied via test-setup.ts beforeAll
    - JWT mint in beforeAll via hono/jwt sign() with env.JWT_SECRET for auth-tier tests
    - Seeded ID constants declared at top of each spec (01DEVUSER, 01PROMPT prefixes from seed.sql)
    - Error envelope shape { error, code } asserted in at least one test per file

key-files:
  created:
    - src/workers/api/routes/prompts.spec.ts
    - src/workers/api/routes/users.spec.ts
    - src/workers/api/routes/search.spec.ts
    - src/workers/api/routes/notifications.spec.ts
  modified: []

key-decisions:
  - "notifications.spec.ts 401 test confirms /notifications is not yet mounted (returns 404 from Hono, not 401) — Phase 11 plan-N creates route and mounts it"
  - "search.spec.ts uses 'bug' as seed-data word (appears in 'Write a clear bug report' title) — reliable FTS5 match without content uncertainty"
  - "viewer_reaction/viewer_bookmarked absent-vs-present tested on both listing and detail — validates optionalAuth branching at both endpoints"
  - "activity items assert type:'prompt_created' explicitly — locks activity feed contract before implementation"

patterns-established:
  - "RED spec pattern: each spec declares seeded IDs as named constants at top for maintainability"
  - "Auth-tier testing: unauthenticated + authenticated variants in same describe block using Cookie header"
  - "Pagination shape: { data: [...], next_cursor } asserted on all list endpoints before implementation"

requirements-completed: [API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10, SEARCH-01, SEARCH-02]

# Metrics
duration: 10min
completed: 2026-05-06
---

# Phase 11 Plan 01: Read API Test Scaffolds Summary

**Four failing spec files covering 34 tests for all 12 read-API requirements — RED phase contracts lock behavioral expectations before implementation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-06T19:08:46Z
- **Completed:** 2026-05-06T19:18:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created prompts.spec.ts with 17 RED tests covering GET /prompts (pagination, filters, auth tiers), GET /prompts/:id (detail, 404, viewer fields), GET /prompts/:id/versions, GET /prompts/:id/comments
- Created users.spec.ts, search.spec.ts, notifications.spec.ts with 17 additional RED tests covering user profiles, activity feed, FTS5 search validation, and requireAuth notification gate
- All 34 tests fail against current 501/404 stubs — proving contracts test real behavior, not implementation details

## Task Commits

Each task was committed atomically:

1. **Task 1: Write prompts route test scaffold (RED)** - `82ac84d` (test)
2. **Task 2: Write users + search + notifications test scaffolds (RED)** - `ad5ce85` (test)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/workers/api/routes/prompts.spec.ts` — 17 tests for prompts read endpoints (API-01, API-02, API-03, API-04)
- `src/workers/api/routes/users.spec.ts` — 9 tests for user profile/prompts/activity endpoints (API-05, API-06, API-07)
- `src/workers/api/routes/search.spec.ts` — 6 tests for FTS5 search endpoint (SEARCH-01, SEARCH-02)
- `src/workers/api/routes/notifications.spec.ts` — 3 tests for notifications endpoint with requireAuth (API-10)

## Decisions Made

- Used `'bug'` as the FTS5 search probe word — guaranteed to appear in the seeded prompt "Write a clear bug report", reliable without content uncertainty
- notifications.spec.ts tests against current 404 behavior (not yet mounted) — this is the expected RED state, Phase 11 later mounts the route
- activity items explicitly assert `type: 'prompt_created'` to lock the activity feed contract before any implementation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 spec files are in RED state — ready for Phase 11 plan-02 which implements the route handlers
- The spec files serve as the behavioral contract that plan-02 must satisfy (GREEN phase)
- No blockers

---
*Phase: 11-read-api*
*Completed: 2026-05-06*
