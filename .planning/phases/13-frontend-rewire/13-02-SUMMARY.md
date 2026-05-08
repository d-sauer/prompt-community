---
phase: 13-frontend-rewire
plan: "02"
subsystem: auth
tags: [hono, pinia, vue, cookie, fetch, vitest]

# Dependency graph
requires:
  - phase: 10-auth-migration
    provides: auth.ts with setCookie/deleteCookie imports, useAuthStore with fetchMe pattern
provides:
  - POST /auth/logout endpoint in Hono auth worker (clears pc_session cookie)
  - Async logout() in useAuthStore that calls /auth/logout before clearing user.value
  - Tests confirming logout fetch behavior and silent failure semantics
affects: [13-frontend-rewire, any component calling useAuthStore.logout()]

# Tech tracking
tech-stack:
  added: []
  patterns: [async logout with silent catch — same shape as fetchMe, deleteCookie with explicit cookie options mirror setCookie options]

key-files:
  created: []
  modified:
    - src/workers/api/routes/auth.ts
    - src/stores/useAuthStore.ts
    - src/stores/useAuthStore.spec.ts

key-decisions:
  - "logout() clears user.value after try/catch block — guaranteed to clear regardless of network outcome"
  - "Existing logout test updated to await store.logout() — required because logout() became async and user.value is now cleared after awaited fetch"

patterns-established:
  - "auth/logout POST pattern: fire-and-forget with silent catch, state cleared unconditionally after"

requirements-completed: [FRONT-09]

# Metrics
duration: 2min
completed: 2026-05-08
---

# Phase 13 Plan 02: Logout API Wiring Summary

**POST /auth/logout added to Hono auth worker and useAuthStore.logout() made async with silent-failure fetch pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T18:29:15Z
- **Completed:** 2026-05-08T18:31:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `auth.post('/logout')` to Hono auth worker — calls `deleteCookie('pc_session')` and returns `{ ok: true }`
- Made `logout()` in `useAuthStore` async — POSTs to `/auth/logout` with `credentials: 'include'`, clears `user.value` unconditionally
- Added 3 new FRONT-09 spec tests; all 13 tests pass (including updated existing logout test)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED/GREEN combined — backend route, no spec):** `308feb9` feat(13-02): add POST /auth/logout endpoint to auth worker
2. **Task 2 RED:** `2d88031` test(13-02): add failing tests for logout() POST /auth/logout behavior
3. **Task 2 GREEN:** `caf8c65` feat(13-02): wire useAuthStore.logout() to POST /auth/logout

_Note: TDD tasks had separate RED and GREEN commits for Task 2_

## Files Created/Modified
- `src/workers/api/routes/auth.ts` - Added `auth.post('/logout', ...)` before catch-all handler
- `src/stores/useAuthStore.ts` - logout() changed to async, calls `/auth/logout`, clears user.value after try/catch
- `src/stores/useAuthStore.spec.ts` - Added 3 FRONT-09 tests; updated existing logout test to await

## Decisions Made
- `logout()` clears `user.value` after the try/catch block (not inside it) — guarantees state is always cleared even on network failure
- Existing `logout()` test updated to `await store.logout()` — required deviation since making logout async means user.value is cleared after the awaited fetch, not synchronously

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing logout() test to await the async call**
- **Found during:** Task 2 (Wire useAuthStore.logout())
- **Issue:** Plan said "Do not modify any existing tests" but making logout() async meant the existing test `store.logout()` (without await) would assert user.value before it was cleared
- **Fix:** Changed `store.logout()` to `await store.logout()` in the retained test
- **Files modified:** src/stores/useAuthStore.spec.ts
- **Verification:** All 13 tests pass
- **Committed in:** 2d88031 (RED commit)

---

**Total deviations:** 1 auto-fixed (1 bug — async interface change required test update)
**Impact on plan:** Essential for test correctness. No scope creep.

## Issues Encountered
None beyond the async test update above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Logout API wiring complete — clean session termination now available
- Ready for remaining Phase 13 plans (API client, store migrations)

---
*Phase: 13-frontend-rewire*
*Completed: 2026-05-08*
