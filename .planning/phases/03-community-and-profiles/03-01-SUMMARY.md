---
phase: 03-community-and-profiles
plan: 01
subsystem: api
tags: [tanstack-query, pinia, graphql, github-api, optimistic-ui, tdd]

requires:
  - phase: 02-read-and-contribute
    provides: "Prompt type, usePromptDetail composable, mutations.ts pattern, TanStack Query v5 setup"

provides:
  - "ReactionGroup interface with viewerHasReacted field"
  - "ReactionContent type ('THUMBS_UP' | 'HEART' | 'ROCKET')"
  - "nodeId: string on Prompt interface for GraphQL mutations"
  - "addReaction/removeReaction GraphQL mutation functions"
  - "useReactions composable with optimistic update and rollback"
  - "Wave 0 test stubs for useComments, useFlagPrompt, useBookmarksStore, useUserProfile"

affects:
  - 03-community-and-profiles
  - plan-02-reaction-bar-component
  - plan-03-comments
  - plan-04-bookmarks

tech-stack:
  added: []
  patterns:
    - "toggle() reads cache before onMutate to avoid add/remove decision flip from optimistic update"
    - "ToggleInput { content, isRemoving } passed to mutationFn to preserve pre-optimistic state"
    - "Wave 0 stub pattern: it.todo() in describe blocks to satisfy test file existence requirements"

key-files:
  created:
    - src/composables/queries/useReactions.ts
    - src/composables/queries/useReactions.spec.ts
    - src/composables/queries/useComments.spec.ts
    - src/composables/queries/useFlagPrompt.spec.ts
    - src/composables/queries/useUserProfile.spec.ts
    - src/stores/useBookmarksStore.spec.ts
  modified:
    - src/types/index.ts
    - src/lib/github/queries.ts
    - src/lib/github/mutations.ts
    - src/composables/queries/usePromptDetail.ts

key-decisions:
  - "toggle() function reads viewerHasReacted from cache BEFORE calling mutateAsync, so mutationFn receives isRemoving: boolean snapshot unaffected by onMutate optimistic flip"
  - "useMutation accepts ToggleInput { content, isRemoving } instead of raw ReactionContent — preserves correct add/remove dispatch across onMutate/mutationFn execution order"

patterns-established:
  - "Optimistic mutation pattern: snapshot viewerHasReacted pre-mutation, pass as input, onMutate flips UI, onError restores from context.previous"

requirements-completed: [COMM-01, COMM-02, COMM-05]

duration: 6min
completed: 2026-03-15
---

# Phase 3 Plan 01: Reactions Foundation Summary

**GitHub GraphQL reaction mutations with TanStack Query v5 optimistic UI — toggle() snapshots viewerHasReacted before onMutate to prevent add/remove dispatch inversion**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-15T07:10:39Z
- **Completed:** 2026-03-15T07:16:24Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Extended Prompt type with `nodeId: string` and `ReactionGroup` interface with `viewerHasReacted: boolean`
- Added `addReaction`/`removeReaction` GraphQL mutations to mutations.ts using authenticated `createGraphqlClient`
- Implemented `useReactions` composable with optimistic update, onError rollback, and onSettled invalidation
- Full TDD unit test coverage: add/remove dispatch, optimistic increment/decrement, rollback on error
- Created Wave 0 `it.todo()` stubs for useComments, useFlagPrompt, useBookmarksStore, useUserProfile

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types, queries, and add reaction mutations** - `de3cbf5` (feat)
2. **Task 2: Wave 0 test stubs + useReactions composable** - `d8bf80b` (feat)

_Note: TDD tasks — RED phase confirmed before GREEN implementation_

## Files Created/Modified
- `src/types/index.ts` - Added ReactionGroup interface, ReactionContent type, nodeId on Prompt
- `src/lib/github/queries.ts` - Added `id` and `viewerHasReacted` fields to GET_PROMPT_DETAIL
- `src/lib/github/mutations.ts` - Added addReaction/removeReaction GraphQL mutations
- `src/composables/queries/usePromptDetail.ts` - Maps nodeId and viewerHasReacted from API response
- `src/composables/queries/useReactions.ts` - Toggle composable with ToggleInput pattern
- `src/composables/queries/useReactions.spec.ts` - 5 unit tests, all passing
- `src/composables/queries/useComments.spec.ts` - Wave 0 stub (1 todo)
- `src/composables/queries/useFlagPrompt.spec.ts` - Wave 0 stub (1 todo)
- `src/composables/queries/useUserProfile.spec.ts` - Wave 0 stub (1 todo)
- `src/stores/useBookmarksStore.spec.ts` - Wave 0 stub (3 todos)

## Decisions Made

1. **ToggleInput pattern**: `mutationFn` receives `{ content, isRemoving }` instead of raw `ReactionContent`. The `toggle()` wrapper reads `viewerHasReacted` from cache BEFORE calling `mutateAsync`. This ensures the add/remove decision is based on the pre-optimistic state. Without this, `onMutate` flips `viewerHasReacted` before `mutationFn` runs, causing every add to become a remove and vice versa.

2. **`toggle()` + `toggleReaction` both exported**: `toggle()` is the consumer-facing API (reads state, dispatches correct action). `toggleReaction` is the raw mutation result exposed for `isPending`, `isError` reactive state in UI components.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed onMutate/mutationFn execution order causing add/remove inversion**
- **Found during:** Task 2 (TDD RED→GREEN phase)
- **Issue:** Plan specified `mutationFn` reads `viewerHasReacted` from cache to decide add/remove. But TanStack Query runs `onMutate` before `mutationFn`, and `onMutate` optimistically flips `viewerHasReacted`. Result: add always called removeReaction, remove always called addReaction.
- **Fix:** Introduced `ToggleInput { content, isRemoving }` type. Added `toggle()` wrapper that reads cache state before mutation fires and passes `isRemoving` as explicit input to `mutationFn`.
- **Files modified:** src/composables/queries/useReactions.ts, src/composables/queries/useReactions.spec.ts
- **Verification:** All 5 unit tests pass including "addReaction fires when viewerHasReacted is false" and "removeReaction fires when viewerHasReacted is true"
- **Committed in:** d8bf80b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix necessary for correctness — without it every reaction toggle would dispatch the wrong mutation. No scope creep; same external behavior as plan specified.

## Issues Encountered

The TanStack Query v5 `onMutate` → `mutationFn` execution order caused the initial implementation to dispatch the wrong mutation type. Discovered during TDD RED phase when "addReaction fires when viewerHasReacted is false" failed with 0 mock calls. Resolved by snapshotting `isRemoving` before the optimistic update.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useReactions` composable ready for `ReactionBar` component in plan 02
- Wave 0 test stubs exist for all Phase 3 composables (plans 03-06 have test targets)
- `nodeId` on Prompt means any component with a prompt ref can initiate reactions
- COMM-05 foundation: `toggle()` passes `authStore.token!` — unauthenticated CTA rendering is plan 02 responsibility (ReactionBar checks `authStore.isAuthenticated`)

---
*Phase: 03-community-and-profiles*
*Completed: 2026-03-15*
