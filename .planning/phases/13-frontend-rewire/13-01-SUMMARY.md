---
phase: 13-frontend-rewire
plan: "01"
subsystem: api
tags: [typescript, vitest, fetch, ulid, pinia, vueuse]

# Dependency graph
requires:
  - phase: 12-write-api
    provides: "Write API endpoints (prompts, comments, reactions, bookmarks, notifications)"
  - phase: 11-read-api
    provides: "Read API endpoints (prompts, search, labels, notifications, users)"
provides:
  - "apiFetch<T> fetch wrapper with credentials:include, VITE_API_URL base, error handling, 204 support"
  - "All GET API functions in src/lib/api/queries.ts"
  - "All write API functions in src/lib/api/mutations.ts (no token params — cookie auth)"
  - "Updated Prompt interface: id is string (ULID), nodeId removed, status field added"
  - "useBookmarksStore bookmarkedIds changed from number[] to string[]"
  - "Unit test coverage for all API client functions"
affects:
  - "13-02-PLAN (usePrompts composable rewire)"
  - "13-03-PLAN (composable migration)"
  - "13-04-PLAN (composable migration)"
  - "13-05-PLAN (component migration)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "apiFetch<T> as single fetch primitive — all queries and mutations call it, never raw fetch"
    - "Cookie-based auth — no token parameters on any API function (credentials:include handles it)"
    - "URLSearchParams for query string serialization in GET functions"
    - "TDD with vi.mock('./http') pattern for testing queries and mutations in isolation"

key-files:
  created:
    - src/lib/api/http.ts
    - src/lib/api/queries.ts
    - src/lib/api/mutations.ts
    - src/lib/api/http.spec.ts
    - src/lib/api/queries.spec.ts
    - src/lib/api/mutations.spec.ts
  modified:
    - src/types/index.ts
    - src/stores/useBookmarksStore.ts

key-decisions:
  - "apiFetch is the single fetch primitive — queries.ts and mutations.ts never call fetch directly"
  - "No token parameters on any mutation function — HttpOnly cookie via credentials:include handles auth"
  - "flagPrompt implemented as no-op throwing Error('flag endpoint not yet available') — Phase 14 scope per CONTEXT.md"
  - "PageResponse<T> interface defined in queries.ts for list endpoints returning cursor-based pagination"
  - "buildQuery helper normalizes null/undefined params from FilterState for URLSearchParams"

patterns-established:
  - "API layer pattern: apiFetch(path, options?) — path string, optional RequestInit, no auth tokens"
  - "TDD mock pattern: vi.mock('./http', () => ({ apiFetch: vi.fn().mockResolvedValue({}) })) for query/mutation specs"
  - "Query string pattern: buildQuery() filters out null/undefined/empty values before URLSearchParams"

requirements-completed: [FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05]

# Metrics
duration: 9min
completed: 2026-05-08
---

# Phase 13 Plan 01: Type Contracts and API Client Layer Summary

**apiFetch<T> fetch wrapper with full GET/write API coverage (23 functions), cookie-based auth, and Prompt.id changed to ULID string**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-08T18:29:25Z
- **Completed:** 2026-05-08T18:38:00Z
- **Tasks:** 2 (Task 1: type contracts, Task 2: API client with TDD)
- **Files modified:** 8

## Accomplishments
- Updated Prompt.id from number to string (ULID), removed nodeId, added status field
- Changed useBookmarksStore bookmarkedIds from number[] to string[]
- Created apiFetch<T> with credentials:include, base URL injection, 4xx/5xx error handling, 204 support
- Implemented all 10 GET API functions in queries.ts matching backend route signatures
- Implemented all 13 write API functions in mutations.ts with no token parameters
- 35 unit tests passing across http.spec, queries.spec, mutations.spec

## Task Commits

Each task was committed atomically:

1. **Task 1: Update type contracts** - `f7075bb` (feat)
2. **TDD RED: Failing tests** - `9c4c405` (test)
3. **TDD GREEN: API client implementation** - `51269ae` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD task had RED + GREEN commits as per TDD protocol_

## Files Created/Modified
- `src/types/index.ts` - Prompt.id changed to string, nodeId removed, status field added
- `src/stores/useBookmarksStore.ts` - bookmarkedIds changed from number[] to string[]
- `src/lib/api/http.ts` - apiFetch<T> fetch wrapper
- `src/lib/api/queries.ts` - 10 GET API functions with PageResponse pagination
- `src/lib/api/mutations.ts` - 13 write API functions, no token params, flagPrompt no-op
- `src/lib/api/http.spec.ts` - 6 unit tests for apiFetch behaviors
- `src/lib/api/queries.spec.ts` - 13 unit tests for GET functions
- `src/lib/api/mutations.spec.ts` - 16 unit tests for write functions + token-check assertions

## Decisions Made
- `apiFetch` is the single fetch primitive — no consuming function calls `fetch` directly
- No token parameters on any function — cookie-based auth via `credentials: 'include'` is automatic
- `flagPrompt` throws `Error('flag endpoint not yet available')` — v2 API has no flag endpoint yet (Phase 14)
- `buildQuery` helper strips null/undefined/empty to avoid polluting query strings with `category=&model=`
- `PageResponse<T>` and other shared interfaces defined in queries.ts (not types/index.ts) — they are API-layer concerns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test assertions expecting undefined as second apiFetch argument**
- **Found during:** Task 2 (TDD GREEN phase)
- **Issue:** queries.spec.ts tests used `toHaveBeenCalledWith(path, undefined)` but functions that call `apiFetch(path)` with one argument don't pass `undefined` as second arg — Vitest distinguishes between 1-arg and 2-arg calls
- **Fix:** Removed the `undefined` second argument expectation from all single-path assertions in queries.spec.ts
- **Files modified:** src/lib/api/queries.spec.ts
- **Verification:** All 35 tests pass after fix
- **Committed in:** 51269ae (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test assertion bug)
**Impact on plan:** Fix was in test expectations only, not implementation. No behavior changed.

## Issues Encountered
None beyond the test assertion fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API client layer complete — Plans 03 and 04 (composable migration) can now start
- TypeScript type cascade errors expected from Prompt.id change — Plans 03, 04, 05 resolve those
- All downstream composables should import from `@/lib/api/queries` and `@/lib/api/mutations` going forward

---
*Phase: 13-frontend-rewire*
*Completed: 2026-05-08*
