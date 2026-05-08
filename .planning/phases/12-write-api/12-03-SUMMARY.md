---
phase: 12-write-api
plan: "03"
subsystem: api
tags: [hono, drizzle, d1, cloudflare-workers, tdd, versions]

# Dependency graph
requires:
  - phase: 12-write-api
    plan: "01"
    provides: "RED test contracts for API-14 and API-15 in write.spec.ts"
provides:
  - "POST /prompts/:id/versions handler: auto-incrementing version_number, 201 with version object (API-14)"
  - "POST /prompts/:id/versions/:n/restore handler: non-destructive restore from version N, auto-changelog (API-15)"
  - "Both endpoints require JWT auth (401 without), return 404 on unknown prompt or version"
affects: [12-write-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD GREEN: add route handlers until failing tests turn green"
    - "MAX(version_number) + 1 auto-increment for version numbers (starts at 1)"
    - "Non-destructive restore: copies body from source version into a new version row"
    - "Route registration order: POST /:id/versions MUST precede POST /:id/versions/:n/restore in Hono"

key-files:
  created: []
  modified:
    - src/workers/api/routes/prompts.ts

key-decisions:
  - "Route order enforced: POST /:id/versions registered before /:id/versions/:n/restore to avoid Hono routing conflicts"
  - "created_at in response uses new Date().toISOString() — consistent with returning it immediately without a DB re-fetch"
  - "Restore changelog auto-text: 'Restored from version N' — matches plan spec"
  - "MAX(version_number) aggregate used via sql<number> template for type-safe version auto-increment"

patterns-established:
  - "sql<number> typed aggregate: `sql<number>`MAX(version_number)`` for typed Drizzle aggregate queries"
  - "Non-destructive restore pattern: lookup source, compute max+1, insert new row with source body"

requirements-completed: [API-14, API-15]

# Metrics
duration: 2min
completed: "2026-05-08"
---

# Phase 12 Plan 03: Version Write Handlers Summary

**POST /prompts/:id/versions with auto-incremented version numbers, and POST /prompts/:id/versions/:n/restore with non-destructive copy semantics using Drizzle MAX aggregate**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T16:13:52Z
- **Completed:** 2026-05-08T16:16:13Z
- **Tasks:** 2 (combined into single commit — Task 2 directly extends Task 1 in same file)
- **Files modified:** 1

## Accomplishments

- Implemented `POST /prompts/:id/versions` (API-14): validates prompt exists, computes MAX(version_number)+1, inserts version row, returns 201 with version object
- Implemented `POST /prompts/:id/versions/:n/restore` (API-15): validates prompt + source version exist, computes next version number, inserts new version from source body with auto changelog
- All 4 version/restore tests now GREEN (were RED); no regressions in 17 existing GET prompts tests
- Route order enforced: POST /:id/versions registered before /:id/versions/:n/restore to prevent Hono routing conflicts

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: POST /prompts/:id/versions and POST /prompts/:id/versions/:n/restore** - `f8bfc0b` (feat)

**Plan metadata:** (final docs commit follows)

## Files Created/Modified

- `src/workers/api/routes/prompts.ts` - Added two new POST route handlers (API-14 and API-15) before `export default app`

## Decisions Made

- Route registration order: `POST /:id/versions` MUST precede `POST /:id/versions/:n/restore` — Hono will greedily match `:n/restore` as a continuation of the `:id/versions` route if registered first
- `created_at` in response uses `new Date().toISOString()` rather than re-fetching from DB — avoids an extra SELECT and the value is correct within acceptable precision
- Restore changelog auto-text: `"Restored from version ${versionNumber}"` as specified in plan
- `sql<number>` typed aggregate for MAX query: `sql<number>\`MAX(version_number)\`` provides type-safe aggregation consistent with codebase patterns

## Deviations from Plan

None - plan executed exactly as written. Both tasks combined into a single atomic commit as they extend the same file in a coherent unit.

## Issues Encountered

- Found that plan 12-02 had already been applied (imports for `requireAuth`, `ulid`, `sql` already present, and POST /, PATCH /:id, DELETE /:id already implemented). Proceeded directly to adding version handlers without any conflict.

## Next Phase Readiness

- API-14 and API-15 are fully implemented and GREEN
- Plans 12-04 and 12-05 can proceed: 14 remaining tests in write.spec.ts still failing (API-16 through API-21)
- No blockers

---
*Phase: 12-write-api*
*Completed: 2026-05-08*
