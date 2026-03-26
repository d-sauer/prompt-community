---
phase: 07-wire-etag-caching
plan: 01
subsystem: infra
tags: [etag, localStorage, lru, octokit, caching, rate-limit]

# Dependency graph
requires:
  - phase: 04-admin-and-pwa
    provides: useAdminLabels composable and getRepoLabels/getIssueComments REST queries
  - phase: 05-fix-user-identity
    provides: useAuthStore with user.login available in stores

provides:
  - localStorage-backed per-user ETag cache with 50-entry LRU cap (etag.ts)
  - Octokit REST client wired with makeBoundFetch as fetch adapter (octokit.ts)
  - getRepoLabels and getIssueComments thread userLogin to createRestClient (queries.ts)
  - Label mutations clear ETag on success to force fresh GET after write (useAdminLabels.ts)
  - logout() purges user ETag namespace from localStorage before clearing state (useAuthStore.ts)

affects:
  - Any future REST reads through createRestClient will automatically send If-None-Match headers
  - Any phase that adds REST mutations should call clearEtag in onSuccess

# Tech tracking
tech-stack:
  added: []
  patterns:
    - localStorage-backed LRU Map serialized as JSON array of [key, value] pairs
    - makeBoundFetch closure pattern: userLogin captured at construction, cacheKey derived from URL pathname
    - Octokit request.fetch adapter injection for transparent ETag caching
    - vi.stubGlobal('localStorage', mock) pattern required in this project (setup.ts spies on Storage.prototype break direct localStorage access)

key-files:
  created:
    - src/lib/github/etag.spec.ts
  modified:
    - src/lib/github/etag.ts
    - src/lib/github/octokit.ts
    - src/lib/github/queries.ts
    - src/composables/queries/useAdminLabels.ts
    - src/composables/queries/useAdminLabels.spec.ts
    - src/stores/useAuthStore.ts
    - src/stores/useAuthStore.spec.ts

key-decisions:
  - "etag.ts uses vi.stubGlobal localStorage mock in specs — setup.ts spies on Storage.prototype.setItem/getItem globally, causing direct localStorage access to return undefined after vi.clearAllMocks(); stubGlobal with an in-memory mock is the correct pattern for this project"
  - "STORAGE_KEY format is etag-cache:{login} — scopes ETag namespace per GitHub user so multi-user scenarios (e.g. switching accounts) never share cached ETags"
  - "makeBoundFetch derives cacheKey as {userLogin}:{pathname} — pathname-only key avoids query string variance while remaining unique per endpoint"
  - "Default userLogin='' in createRestClient/getRepoLabels/getIssueComments — backward-compatible; existing callers without userLogin still cache under etag-cache: (empty login) and benefit from in-session caching"

patterns-established:
  - "ETag invalidation pattern: import clearEtag in mutation composables; call clearEtag in onSuccess alongside cache invalidation"
  - "Logout ETag cleanup: capture login BEFORE nulling user.value; call clearUserEtags(login) if set"

requirements-completed:
  - INFR-05

# Metrics
duration: 6min
completed: 2026-03-26
---

# Phase 7 Plan 01: Wire ETag Caching Summary

**localStorage-backed per-user ETag LRU cache (50-entry cap) wired as Octokit fetch adapter; label mutations and logout invalidate appropriately**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-26T16:30:00Z
- **Completed:** 2026-03-26T16:36:00Z
- **Tasks:** 3 (TDD: RED → GREEN → integration)
- **Files modified:** 7

## Accomplishments
- etag.ts rewritten: in-memory Map replaced with localStorage-backed LRU store, scoped per GitHub user login with 50-entry cap and silent error degradation
- Octokit REST client factory updated to accept userLogin and wire makeBoundFetch as the fetch adapter, activating If-None-Match headers on all REST reads
- Label create/update/delete mutations now call clearEtag in onSuccess; logout() purges the user's ETag namespace before nulling state

## Task Commits

Each task was committed atomically:

1. **Task 0: Write failing specs for etag.ts localStorage behaviors** - `cd712e2` (test)
2. **Task 1: Rewrite etag.ts with localStorage LRU; wire adapter in octokit.ts; thread userLogin in queries.ts** - `81ecb20` (feat)
3. **Task 2: Wire clearEtag in label mutations and clearUserEtags in logout** - `c0b60dc` (feat)

## Files Created/Modified
- `src/lib/github/etag.ts` - Rewritten: localStorage LRU store with getEtag/setEtag/clearEtag/clearUserEtags/makeBoundFetch
- `src/lib/github/etag.spec.ts` - Created: 11 tests covering all localStorage behaviors (TDD RED then GREEN)
- `src/lib/github/octokit.ts` - createRestClient accepts userLogin, wires makeBoundFetch as fetch adapter
- `src/lib/github/queries.ts` - getRepoLabels and getIssueComments accept optional userLogin parameter
- `src/composables/queries/useAdminLabels.ts` - clearEtag called in all three mutation onSuccess; queryFn passes userLogin
- `src/composables/queries/useAdminLabels.spec.ts` - Added vi.mock for etag module; 3 new clearEtag assertion tests
- `src/stores/useAuthStore.ts` - logout() captures login before nulling state, calls clearUserEtags(login)
- `src/stores/useAuthStore.spec.ts` - Added vi.mock for etag module; logout clearUserEtags assertion test

## Decisions Made
- **vi.stubGlobal for localStorage in etag.spec.ts:** setup.ts globally spies on `Storage.prototype.setItem` and `Storage.prototype.getItem`. After `vi.clearAllMocks()`, these spies return undefined instead of delegating to jsdom's actual implementation, making `setEtag`/`getEtag` appear broken. Used the same in-memory localStorage stub pattern as `useOfflineQueue.spec.ts`.
- **STORAGE_KEY = `etag-cache:{login}`:** Namespaces ETag cache per GitHub user so account switching never leaks cached ETags across users.
- **Default `userLogin = ''`:** Backward-compatible; callers that don't pass userLogin still benefit from in-session caching (stored under empty-login key).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] etag.spec.ts: replaced localStorage.clear() with key-enumeration loop; then replaced with vi.stubGlobal pattern**
- **Found during:** Task 0 (writing failing specs) and Task 1 (GREEN phase)
- **Issue:** Plan specified `localStorage.clear()` in `beforeEach`, but jsdom throws `localStorage.clear is not a function` because setup.ts's `vi.spyOn(Storage.prototype, 'setItem/getItem')` breaks the localStorage interface. After switching to `vi.clearAllMocks()` (instead of `vi.restoreAllMocks()`), localStorage writes would succeed but reads returned undefined because the getItem spy was cleared to a no-op.
- **Fix:** Used `vi.stubGlobal('localStorage', inMemoryMock)` + `vi.resetModules()` in beforeEach — the same pattern already used by `useOfflineQueue.spec.ts` in this project.
- **Files modified:** src/lib/github/etag.spec.ts
- **Verification:** All 11 etag spec tests pass green; no regressions in full suite
- **Committed in:** 81ecb20 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: test environment localStorage interference)
**Impact on plan:** Fix was necessary for tests to function; no scope creep. Implementation logic unchanged.

## Issues Encountered
- jsdom + `vi.spyOn(Storage.prototype, ...)` global spy pattern in `setup.ts` breaks direct `localStorage` access in specs — resolved by adopting the project's existing in-memory mock pattern.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INFR-05 complete: all REST reads via createRestClient now send If-None-Match headers and 304 responses consume zero rate-limit quota
- localStorage persists ETags across page reloads, scoped per GitHub user login
- Any future REST mutation composable should follow the clearEtag-in-onSuccess pattern established here

---
*Phase: 07-wire-etag-caching*
*Completed: 2026-03-26*

## Self-Check: PASSED

- etag.ts: FOUND
- etag.spec.ts: FOUND
- octokit.ts: FOUND
- queries.ts: FOUND
- useAdminLabels.ts: FOUND
- useAuthStore.ts: FOUND
- 07-01-SUMMARY.md: FOUND
- Commit cd712e2: FOUND
- Commit 81ecb20: FOUND
- Commit c0b60dc: FOUND
