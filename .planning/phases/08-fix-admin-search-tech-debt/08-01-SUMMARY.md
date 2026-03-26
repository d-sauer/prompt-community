---
phase: 08-fix-admin-search-tech-debt
plan: "01"
subsystem: admin
tags: [vue-query, tanstack-query, etag-caching, typescript, vitest, composables]

# Dependency graph
requires:
  - phase: 07-wire-etag-caching
    provides: getIssueComments with userLogin 3rd param for per-user ETag scoping
  - phase: 04-admin-and-pwa
    provides: useAdminActions, useAdminLog, useCreatePrompt composables
provides:
  - invalidateAdmin() now invalidates ['admin','log'] queryKey so moderation log refreshes immediately after actions
  - getIssueComments called with per-user ETag scope in useAdminLog (INFR-05 complete for admin log path)
  - useCreatePrompt.ts compiles without unused-import TypeScript warning (CONT-01 clean)
affects: [admin-moderation-flow, etag-caching, typescript-build]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD red-green cycle: extend spec assertion first, then add one source line to pass"
    - "invalidateAdmin() centralizes all three cache keys (queue, stats, log) — all 7 mutations benefit automatically"

key-files:
  created: []
  modified:
    - src/composables/queries/useAdminActions.ts
    - src/composables/queries/useAdminActions.spec.ts
    - src/composables/queries/useAdminLog.ts
    - src/composables/queries/useAdminLog.spec.ts
    - src/composables/queries/useCreatePrompt.ts

key-decisions:
  - "invalidateAdmin() adds ['admin','log'] alongside queue and stats — no staleTime removal, no ETag clearing (locked decision from CONTEXT.md)"
  - "ETag scoping via authStore.user?.login ?? '' as third arg to getIssueComments — consistent with STORAGE_KEY = etag-cache:{login} pattern from phase 07"
  - "Dead code removal: useSearchStore import, instantiation, and void searchStore expression all removed — no functional replacement needed"

patterns-established:
  - "Per-user ETag scoping pattern: always pass authStore.user?.login ?? '' as third argument to getIssueComments"

requirements-completed: [ADMN-08, INFR-05, CONT-01]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 8 Plan 01: Fix Admin Log Freshness, ETag Scoping, and Dead Code Summary

**Admin log now invalidates immediately after moderation actions, getIssueComments scoped per user for ETag caching, and useCreatePrompt compiles clean with no unused-import warning**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T21:17:09Z
- **Completed:** 2026-03-26T21:18:46Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Admin moderation log refreshes immediately after approve/hide/delete/feature/bulk actions (no 60s stale window) — ADMN-08 complete
- getIssueComments in useAdminLog now receives authStore.user?.login as third arg, scoping ETag cache per authenticated user — INFR-05 fully covered for admin log path
- useCreatePrompt.ts no longer imports or references useSearchStore — TypeScript compiles without unused-import warning — CONT-01 clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ['admin','log'] invalidation to invalidateAdmin() and extend spec assertion** - `1a37c56` (feat)
2. **Task 2: Pass userLogin to getIssueComments in useAdminLog and add ETag scoping spec** - `85520ba` (feat)
3. **Task 3: Remove dead void searchStore expression and orphaned useSearchStore import** - `e8136f7` (fix)

**Plan metadata:** (docs commit after state update)

_Note: Tasks 1 and 2 followed TDD red-green cycle (spec assertion added first, then source change to pass)_

## Files Created/Modified
- `src/composables/queries/useAdminActions.ts` - Added `void queryClient.invalidateQueries({ queryKey: ['admin', 'log'] })` to invalidateAdmin()
- `src/composables/queries/useAdminActions.spec.ts` - Added assertion for ['admin','log'] queryKey in invalidation test
- `src/composables/queries/useAdminLog.ts` - Added `authStore.user?.login ?? ''` as third arg to getIssueComments
- `src/composables/queries/useAdminLog.spec.ts` - Added import for queries module and new ETag scoping test
- `src/composables/queries/useCreatePrompt.ts` - Removed useSearchStore import, instantiation, and void searchStore dead expression

## Decisions Made
- No staleTime removal from useAdminLog — invalidation (not staleTime change) is the correct fix for log freshness
- No ETag clearing alongside invalidation — locked decision from CONTEXT.md, invalidation alone is sufficient
- Third arg pattern `authStore.user?.login ?? ''` matches the default userLogin='' backward compatibility in queries.ts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all three changes were straightforward targeted edits with clear source/spec pairing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three ADMN-08, INFR-05, and CONT-01 requirements closed
- No regressions — full Vitest suite 26 passed, 5 skipped (pre-existing), 0 failed
- TypeScript exits clean (npx tsc --noEmit with no output)

---
*Phase: 08-fix-admin-search-tech-debt*
*Completed: 2026-03-26*
