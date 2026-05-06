---
phase: 11-read-api
plan: "02"
subsystem: api
tags: [hono, drizzle, d1, sqlite, pagination, cursor, prompts]

requires:
  - phase: 11-read-api/11-01
    provides: RED test scaffolds for prompts read API (prompts.spec.ts with 17 failing tests)
  - phase: 10-auth-migration
    provides: optionalAuth/requireAuth middleware, Env type, UserContext type

provides:
  - "GET /prompts: paginated listing with cursor, category/model/difficulty filters, viewer fields on auth"
  - "GET /prompts/:id: full detail with body, tags, author, reaction_counts; 404 on unknown/flagged/hidden"
  - "GET /prompts/:id/versions: paginated version history joined with authors; 404 on unknown prompt"
  - "GET /prompts/:id/comments: paginated comments with soft-delete masking; 404 on unknown prompt"
  - "test-setup.ts: seed data injection pattern — global-setup provides seed SQL, worker setup executes it"

affects: [11-03, 11-04, 13-frontend-rewire]

tech-stack:
  added: [hono/trailing-slash (trimTrailingSlash)]
  patterns:
    - "Drizzle inline queries in route handlers — no repository layer yet"
    - "Fetch-aggregate-in-JS for reaction counts and tags (avoids D1 subquery limits)"
    - "inArray() for bulk lookups across list results (N+1 prevention)"
    - "Seed SQL injection via vitest provide/inject — global-setup reads file, worker beforeAll executes"
    - "trimTrailingSlash() middleware on sub-apps to fix Hono /path/ routing"

key-files:
  created: []
  modified:
    - src/workers/api/routes/prompts.ts
    - src/workers/api/test-setup.ts
    - vitest.global-setup.ts

key-decisions:
  - "Seed SQL provided to worker context via vitest global-setup provide/inject pattern — not as a migration; allows test isolation"
  - "Comment lines stripped from seed SQL before split-on-semicolon parsing (comment text contains semicolons)"
  - "trimTrailingSlash() added to prompts/users/search sub-apps — Hono sub-app GET '/' does not match /prefix/"
  - "Reaction counts and tags fetched with inArray() then aggregated in JS — avoids D1 GROUP BY subquery issues"
  - "Author's own drafts included for authenticated callers via second query merged with published results"

patterns-established:
  - "Test seed injection: vitest.global-setup.ts reads scripts/seed.sql, provides as d1SeedSql; test-setup.ts injectAny('d1SeedSql') and executes statements"
  - "Trailing slash: every Hono sub-app gets app.use('*', trimTrailingSlash()) to satisfy /prefix/ boot test"

requirements-completed: [API-01, API-02, API-03, API-04]

duration: 15min
completed: 2026-05-06
---

# Phase 11 Plan 02: Prompts Read API Summary

**Four GET handlers for prompts read API using Drizzle + D1: listing with cursor pagination and viewer fields, full detail with body, version history, and soft-delete-aware comments — turning 17 RED spec tests GREEN**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-06T19:13:00Z
- **Completed:** 2026-05-06T19:22:00Z
- **Tasks:** 2
- **Files modified:** 3 (prompts.ts, test-setup.ts, vitest.global-setup.ts) + trailing slash fix in users.ts and search.ts

## Accomplishments

- Implemented all four GET handlers in `src/workers/api/routes/prompts.ts`, turning 17 previously failing spec tests GREEN
- Established seed data injection pattern for worker test environment (global-setup provides seed SQL, worker beforeAll executes it)
- Fixed Hono sub-app trailing slash routing issue affecting index.spec.ts boot tests

## Task Commits

1. **Task 1 + 2: GET /prompts, /:id, /:id/versions, /:id/comments + seed injection** - `402314c` (feat — included in parallel 11-04 commit)
2. **Auto-fix: trailing slash routing** - `010140e` (fix)

**Plan metadata:** (created after this commit)

## Files Created/Modified

- `src/workers/api/routes/prompts.ts` — Four GET handlers replacing the 501 stub; optionalAuth for viewer fields; cursor pagination; inArray bulk fetching
- `src/workers/api/test-setup.ts` — Extended beforeAll to execute seed SQL after migrations via inject()
- `vitest.global-setup.ts` — Reads scripts/seed.sql and provides it via vitest provide() for worker test context
- `src/workers/api/routes/users.ts` — Added trimTrailingSlash() (fix for boot test)
- `src/workers/api/routes/search.ts` — Added trimTrailingSlash() (fix for boot test)

## Decisions Made

- **Seed SQL injection via vitest provide/inject**: The D1 test environment applies migrations but not seed data. Added global-setup to read `scripts/seed.sql` (Node.js context) and inject it for worker-context execution. Simpler than adding a seed migration.
- **Comment stripping before semicolon split**: The seed SQL contains comment lines with text after semicolons ("Re-runnable safely; will not duplicate rows"). Strip `--` lines before splitting.
- **trimTrailingSlash on sub-apps**: Hono's `app.route('/prompts', sub)` pattern does not route `GET /prompts/` to `GET /` in the sub-app. trimTrailingSlash() middleware returns 301 for trailing-slash requests, satisfying the index.spec.ts `not.toBe(404)` assertion.
- **inArray() batch queries + JS aggregation**: For listing endpoints, fetch tags and reactions for all prompt IDs in a single query each, then aggregate in JS. Avoids D1 GROUP BY subquery issues and N+1 patterns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added seed data injection to test-setup.ts**
- **Found during:** Task 1 (GET /prompts implementation)
- **Issue:** Tests use `SEEDED_PROMPT_ID = '01PROMPT000000000000000001'` but the test environment only runs migrations, not seed data — DB was empty causing all data-dependent assertions to fail
- **Fix:** Extended `vitest.global-setup.ts` to read `scripts/seed.sql` and provide it; updated `test-setup.ts` to execute seed statements (stripping comment lines before semicolon split)
- **Files modified:** `src/workers/api/test-setup.ts`, `vitest.global-setup.ts`
- **Verification:** 17 prompts.spec.ts tests pass after fix
- **Committed in:** `402314c`

**2. [Rule 1 - Bug] Fixed Hono trailing slash routing regression in index.spec.ts**
- **Found during:** Post-task verification (running full test suite)
- **Issue:** Old stubs used `app.all('*', ...)` catching `/prompts/`, `/users/`, `/search/` with trailing slash. New handlers only register specific GET routes. Hono sub-app `GET /` doesn't match `/prefix/`. Boot test expects `not.toBe(404)` — returned 404.
- **Fix:** Added `app.use('*', trimTrailingSlash())` to prompts.ts, users.ts, and search.ts sub-apps
- **Files modified:** `src/workers/api/routes/prompts.ts`, `src/workers/api/routes/users.ts`, `src/workers/api/routes/search.ts`
- **Verification:** All 61 worker tests pass (8 test files)
- **Committed in:** `010140e`

---

**Total deviations:** 2 auto-fixed (1 missing critical functionality, 1 bug)
**Impact on plan:** Both fixes required for correctness and test suite integrity. No scope creep.

## Issues Encountered

- The `inject()` function in vitest has a strict `keyof ProvidedContext` type constraint — cast via `inject as (key: string) => unknown` to avoid the TS error since no declaration merging exists for `ProvidedContext`
- Pre-existing TypeScript errors in auth.spec.ts, role.spec.ts, notifications.spec.ts, auth.ts (TS2352 and TS2339) — out of scope, deferred

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Prompts read API is complete and all tests pass
- `src/workers/api/routes/users.ts` and `src/workers/api/routes/search.ts` were implemented in a parallel session (not part of this plan's scope but present in the working directory)
- Ready for Phase 11 Plan 03 (users route) and Plan 04 (search route) — implementations are already present from parallel work

---
*Phase: 11-read-api*
*Completed: 2026-05-06*
