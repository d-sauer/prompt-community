---
phase: 13-frontend-rewire
plan: "03"
subsystem: ui
tags: [vue, tanstack-query, composables, api-migration, vitest]

# Dependency graph
requires:
  - phase: 13-01
    provides: "src/lib/api/queries.ts with getPrompts, getPromptDetail, getPromptVersions, getUserProfile, getUserPrompts, getUserActivity"

provides:
  - "usePromptsQuery migrated to getPrompts from @/lib/api/queries with infinite scroll"
  - "usePromptDetail migrated to getPromptDetail — id is now string (ULID)"
  - "usePromptVersions migrated to getPromptVersions — promptId is now string (ULID)"
  - "useUserProfile migrated to getUserProfile + getUserPrompts via Promise.all"
  - "useUserActivity new composable using useInfiniteQuery for GET /users/:login/activity"
  - "usePromptsQuery.spec.ts — 4 tests covering mock, queryKey, pagination, flatten"
  - "useUserActivity.spec.ts — 4 tests covering first load, fetchNextPage, disabled, flatten"

affects:
  - 13-04
  - 13-05
  - any view importing usePromptsQuery, usePromptDetail, usePromptVersions, useUserProfile

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useInfiniteQuery with cursor-based pagination (next_cursor ?? undefined) for activity feed"
    - "Promise.all for parallel API calls in single useQuery queryFn"
    - "vi.mock('@/lib/api/queries') pattern replacing vi.mock('@/lib/github/octokit')"

key-files:
  created:
    - src/composables/queries/usePromptsQuery.spec.ts
    - src/composables/queries/useUserActivity.ts
    - src/composables/queries/useUserActivity.spec.ts
  modified:
    - src/composables/queries/usePromptsQuery.ts
    - src/composables/queries/usePromptDetail.ts
    - src/composables/queries/usePromptVersions.ts
    - src/composables/queries/useUserProfile.ts
    - src/composables/queries/usePromptVersions.spec.ts
    - src/composables/queries/useUserProfile.spec.ts

key-decisions:
  - "parseVersionComment and VERSION_HEADER_RE removed from usePromptVersions — GitHub comment parsing no longer needed; API returns VersionObject[] directly"
  - "useUserProfile uses Promise.all for getUserProfile + getUserPrompts — parallel fetch, no sequential waterfall"
  - "totalSubmissions derived from submissions.value.length — API page limit applies; consistent with first-page data"
  - "useUserActivity exports ActivityItem type re-exported from @/lib/api/queries — consumers import from composable"

patterns-established:
  - "Query composable import pattern: import { getX } from '@/lib/api/queries' — no github imports"
  - "useUserActivity spec: vi.mock('@/lib/api/queries') with mockResolvedValueOnce for pagination test"

requirements-completed:
  - FRONT-07
  - FRONT-11

# Metrics
duration: 10min
completed: 2026-05-08
---

# Phase 13 Plan 03: Query Composables Migration Summary

**5 query composables migrated from GitHub GraphQL to REST API — usePromptsQuery, usePromptDetail, usePromptVersions, useUserProfile plus new useUserActivity with cursor-based infinite scroll**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-08T18:34:20Z
- **Completed:** 2026-05-08T18:44:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Rewrote all 4 existing query composables to use `@/lib/api/queries` — zero `@/lib/github` imports remain
- Created `useUserActivity` composable with `useInfiniteQuery` for the Activity tab, matching the infinite scroll pattern from `usePromptsQuery`
- Added `usePromptsQuery.spec.ts` (4 tests) and `useUserActivity.spec.ts` (4 tests); updated `useUserProfile.spec.ts` and `usePromptVersions.spec.ts` to use new mock targets

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite usePromptsQuery, usePromptDetail, usePromptVersions** - `2822fb3` (feat)
2. **Task 2: Rewrite useUserProfile + create useUserActivity with spec** - `df7d1de` (feat)

## Files Created/Modified
- `src/composables/queries/usePromptsQuery.ts` - Rewrote to use `getPrompts` from `@/lib/api/queries`; removed GitHub GraphQL code
- `src/composables/queries/usePromptsQuery.spec.ts` - New: 4 tests (getPrompts mock, queryKey, pagination, flatten)
- `src/composables/queries/usePromptDetail.ts` - Rewrote; `id` parameter is now `string` (ULID) instead of `number`
- `src/composables/queries/usePromptVersions.ts` - Rewrote; removed `parseVersionComment`; `promptId` is now `string`
- `src/composables/queries/usePromptVersions.spec.ts` - Updated: removed `parseVersionComment` tests (function no longer exported)
- `src/composables/queries/useUserProfile.ts` - Rewrote to use `getUserProfile` + `getUserPrompts` via `Promise.all`
- `src/composables/queries/useUserProfile.spec.ts` - Updated to mock `@/lib/api/queries` instead of `@/lib/github/octokit`
- `src/composables/queries/useUserActivity.ts` - New: infinite query composable for `/users/:login/activity`
- `src/composables/queries/useUserActivity.spec.ts` - New: 4 tests (first load, fetchNextPage, disabled, flatten)

## Decisions Made
- `parseVersionComment` removed entirely — was a GitHub comment parser for the v1 API; v2 API returns `VersionObject[]` directly from the endpoint
- `useUserProfile` uses `Promise.all` to fetch profile and prompts in parallel — avoids waterfall; both calls needed for the profile view
- `totalSubmissions` is `submissions.value.length` — API returns first-page data; consistent with available data
- `useUserActivity` re-exports `ActivityItem` type — consumers can import from the composable without reaching into `@/lib/api/queries`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated useUserProfile.spec.ts mock target**
- **Found during:** Task 2 (rewrite useUserProfile)
- **Issue:** Old spec mocked `@/lib/github/octokit` and expected `search.nodes` response shape — both invalid after migration
- **Fix:** Rewrote spec to mock `getUserProfile` and `getUserPrompts` from `@/lib/api/queries`; updated fixture data to match `Prompt[]` shape
- **Files modified:** `src/composables/queries/useUserProfile.spec.ts`
- **Verification:** Both tests pass
- **Committed in:** `df7d1de` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed reactive queryKey test — useInfiniteQuery does not expose queryKey as ref**
- **Found during:** Task 1 (writing usePromptsQuery.spec.ts)
- **Issue:** Test asserted `composable.queryKey.value` but TanStack Query does not expose `queryKey` as a ref on the return value
- **Fix:** Changed test to verify query was stored under the correct key in QueryClient cache
- **Files modified:** `src/composables/queries/usePromptsQuery.spec.ts`
- **Verification:** Test passes
- **Committed in:** `2822fb3` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All query composables now use `@/lib/api/queries` — ready for views to consume live API data
- `useUserActivity` ready for `ProfileTabs.vue` to wire the Activity tab (Plan 05 scope)
- Plan 04 (mutation composables, parallel wave 2) is independent — both plans can proceed

---
*Phase: 13-frontend-rewire*
*Completed: 2026-05-08*
