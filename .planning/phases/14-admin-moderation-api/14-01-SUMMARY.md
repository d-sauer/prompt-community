---
phase: 14-admin-moderation-api
plan: "01"
subsystem: testing
tags: [vitest, hono, d1, jwt, tdd, cloudflare-workers]

# Dependency graph
requires:
  - phase: 12-write-api
    provides: write.spec.ts TDD pattern — JWT minting, beforeAll setup, cloudflare:test harness
  - phase: 9-backend-foundation
    provides: D1 schema (prompts, moderation_log, labels tables), seed.sql, vitest.workers.config.ts
  - phase: 10-auth-migration
    provides: requireAuth + requireMaintainer middleware, pc_session cookie JWT pattern
provides:
  - RED test contracts for all 7 admin API requirements (API-22 through API-28)
  - 28 failing integration tests covering 6 admin endpoint groups
  - Spec file establishing auth guard test pattern (401 for no JWT, 403 for wrong role)
  - beforeAll flagged prompt insertion pattern for admin queue tests
affects:
  - 14-admin-moderation-api plan-02 (implements handlers to make these tests GREEN)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin spec follows write.spec.ts pattern: request() helper, sign() for JWT mint, cloudflare:test env"
    - "Per-test flagged prompt insertion: unique IDs per test to avoid test-order coupling"
    - "Auth guard assertions: 401 (no JWT) and 403 (wrong role) both assert { error, code } shape"
    - "DB verification pattern: env.DB.prepare().first() to confirm status/log after mutating endpoints"

key-files:
  created:
    - src/workers/api/routes/admin.spec.ts
  modified: []

key-decisions:
  - "Per-test flagged prompt IDs used instead of shared FLAGGED_PROMPT_ID for approve/hide tests — prevents test-order coupling when one test mutates the prompt status"
  - "GET /admin/stats included even though no API-22-28 ID covers it — required by FRONT-06/useAdminStats, minimal extra effort"
  - "LABEL_TO_DELETE_ID set to 01LABEL00000000000000000007 (difficulty:advanced) — separate from SEEDED_LABEL_ID used in PATCH tests to avoid delete-before-patch ordering issues"

patterns-established:
  - "Pattern: Unique prompt IDs per moderation action test — avoids shared mutable state between approve and hide tests"
  - "Pattern: DB verification via env.DB.prepare().first() after mutating endpoint call — confirms actual DB state not just HTTP response"

requirements-completed: [API-22, API-23, API-24, API-25, API-26, API-27, API-28]

# Metrics
duration: 2min
completed: 2026-05-08
---

# Phase 14 Plan 01: Admin API RED Test Contracts Summary

**28 failing vitest integration tests covering all 6 admin endpoint groups (queue, log, approve, hide, label CRUD, stats) with 401/403 auth-guard assertions and DB state verification**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T21:25:44Z
- **Completed:** 2026-05-08T21:27:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/workers/api/routes/admin.spec.ts` with 28 integration tests — all failing RED (501 stub)
- Established flagged prompt insertion pattern in `beforeAll` (seed.sql has none)
- Covered all 7 requirements: API-22 through API-28
- Added `GET /admin/stats` tests (no API ID but needed by FRONT-06/useAdminStats)
- Each auth-guard test verifies both 401 (no JWT) and 403 (wrong role) with `{ error, code }` shape

## Task Commits

1. **Task 1: Write admin.spec.ts RED test contracts** - `197a83a` (test)

## Files Created/Modified

- `src/workers/api/routes/admin.spec.ts` — 28 failing RED tests for all admin endpoint groups

## Decisions Made

- Used per-test unique prompt IDs for approve/hide tests to avoid test-order coupling (each test inserts its own flagged prompt)
- Included `GET /admin/stats` tests despite no explicit API-22-28 requirement — frontend composable useAdminStats requires this endpoint (FRONT-06 scope)
- Set `LABEL_TO_DELETE_ID` to a different seeded label than `SEEDED_LABEL_ID` used in PATCH tests to prevent delete-before-patch ordering issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — test file runs cleanly (no import/TS errors). All 28 tests fail with 501 from the admin.ts stub, confirming correct RED state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RED tests committed and confirmed failing — plan-02 can begin implementing GREEN handlers
- All 6 admin endpoint contracts are formalised: GET /admin/queue, GET /admin/log, POST approve/hide, POST/PATCH/DELETE /labels, GET /admin/stats
- Test file structure mirrors write.spec.ts — plan-02 implementer has clear patterns to follow

---
*Phase: 14-admin-moderation-api*
*Completed: 2026-05-08*
