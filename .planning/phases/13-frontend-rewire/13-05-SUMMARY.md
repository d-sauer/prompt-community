---
phase: 13-frontend-rewire
plan: "05"
subsystem: ui
tags: [vue, tanstack-query, pinia, vitest, workbox, service-worker, date-fns]

# Dependency graph
requires:
  - phase: 13-03
    provides: useUserActivity composable with infinite scroll pagination
  - phase: 13-04
    provides: useReactions updated to single promptId argument; useUserProfile using @/lib/api/queries

provides:
  - ProfileTabs.vue Activity tab wired to live useUserActivity data with load-more button
  - ReactionBar.vue calls useReactions with single prompt.id argument
  - vite.config.ts Workbox caches API paths (api-prompts-cache rule)
  - All composable specs migrated to @/lib/api mock paths
  - tsc + vitest green gate for phase 13 completion

affects: [14-admin-rewire, 15-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Workbox runtimeCaching: path-based URL matching (pathname.startsWith) instead of origin regex — origin-agnostic"
    - "Load-more button pattern for activity pagination — avoids layout shift vs auto-scroll"
    - "useOfflineQueue mocked in spec via vi.mock('@/composables/queries/useOfflineQueue') — isolates mutation composable tests"

key-files:
  created: []
  modified:
    - src/components/profile/ProfileTabs.vue
    - src/components/prompt/ReactionBar.vue
    - vite.config.ts
    - src/composables/queries/usePromptVersions.spec.ts
    - src/composables/queries/useReactions.spec.ts
    - src/composables/queries/useComments.spec.ts
    - src/composables/queries/useFlagPrompt.spec.ts

key-decisions:
  - "Load-more button approach for Activity tab (not auto-scroll) — avoids layout shift, consistent with rest of UI"
  - "useOfflineQueue mocked at module level in useReactions/useComments spec — composable indirectly imports it via useReactions"

patterns-established:
  - "Workbox path-based runtimeCaching: urlPattern as function checking url.pathname.startsWith — avoids hardcoded API origin at build time"

requirements-completed:
  - SEARCH-03
  - SEARCH-04

# Metrics
duration: 7min
completed: 2026-05-08
---

# Phase 13 Plan 05: Frontend UI + Spec Cleanup Summary

**Activity tab wired to useUserActivity with load-more pagination, all composable specs migrated from @/lib/github to @/lib/api mocks, and Workbox SW updated to cache API paths — tsc + vitest green**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-08T18:39:03Z
- **Completed:** 2026-05-08T18:46:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- ProfileTabs.vue Activity tab now renders live useUserActivity data with load-more button; "coming soon" placeholder removed
- ReactionBar.vue updated to call useReactions with single prompt.id (nodeId argument removed)
- vite.config.ts Workbox rule updated: replaced github-api-cache regex with api-prompts-cache pathname-based rule covering /prompts, /users, /search, /labels, /notifications, /me
- All five composable spec files migrated to @/lib/api mock paths with string ULID IDs; 178 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire ProfileTabs.vue Activity tab + fix submission.id + update ReactionBar.vue** - `cf0adff` (feat)
2. **Task 2: Update Workbox SW config + fix affected specs + tsc + vitest gate** - `560927f` (feat)

**Plan metadata:** see final commit

## Files Created/Modified
- `src/components/profile/ProfileTabs.vue` - Added useUserActivity import + Activity tab template; changed submission.number to submission.id; removeBookmark id type string
- `src/components/prompt/ReactionBar.vue` - Removed nodeId argument from useReactions call
- `vite.config.ts` - Replaced github-api-cache with api-prompts-cache pathname-based Workbox rule
- `src/composables/queries/usePromptVersions.spec.ts` - Replaced todo stub with real tests using getPromptVersions mock
- `src/composables/queries/useReactions.spec.ts` - Migrated from @/lib/github/mutations to @/lib/api/mutations; string prompt ID; added useOfflineQueue mock
- `src/composables/queries/useComments.spec.ts` - Migrated from @/lib/github/mutations to @/lib/api/mutations; string prompt ID; added useOfflineQueue mock
- `src/composables/queries/useFlagPrompt.spec.ts` - Migrated from @/lib/github/mutations to @/lib/api/mutations; string prompt ID

## Decisions Made
- Load-more button pattern chosen over auto infinite scroll for Activity tab — avoids layout shift, matches Submitted tab visual style, within Claude's discretion per CONTEXT.md
- useOfflineQueue mocked at module level in mutation composable specs — useReactions and useComments both import it, which would attempt real module initialization without the mock

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed useComments.spec.ts and useFlagPrompt.spec.ts**
- **Found during:** Task 2 (vitest run)
- **Issue:** Both specs still mocked @/lib/github/mutations and used integer issueId (42), while the composables had already been migrated to @/lib/api/mutations with string IDs in Plans 03/04. These caused 4 test failures.
- **Fix:** Rewrote both specs to mock @/lib/api/mutations, use string promptId '01PROMPT001', and removed references to old API (token params, nodeId). Also added useOfflineQueue mock to prevent real module init.
- **Files modified:** src/composables/queries/useComments.spec.ts, src/composables/queries/useFlagPrompt.spec.ts
- **Verification:** npx vitest run — 178 passed, 0 failed
- **Committed in:** 560927f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking pre-existing spec failures from Plan 03/04 migration)
**Impact on plan:** Necessary to achieve the vitest green gate. No scope creep — these specs covered composables already migrated.

## Issues Encountered
- useOfflineQueue is imported indirectly by useReactions and useComments — specs for those composables required mocking useOfflineQueue at the module level to prevent the composable from attempting to access `import.meta.env.VITE_API_URL` (undefined in test env) during initialization

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 13 frontend rewire complete — all composables use @/lib/api, tsc clean, vitest green
- Phase 14 admin rewire can start: admin composables still use @ts-expect-error where applicable, already suppressed
- Phase 15 cleanup: @/lib/github/* files can be deleted after Phase 14 completes

---
*Phase: 13-frontend-rewire*
*Completed: 2026-05-08*
