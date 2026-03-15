---
phase: 03-community-and-profiles
plan: 02
subsystem: ui
tags: [vue, tanstack-query, github-rest, date-fns, lucide]

# Dependency graph
requires:
  - phase: 03-01
    provides: useReactions composable, ReactionGroup type, extended Prompt type with nodeId/reactionGroups

provides:
  - postComment REST mutation function
  - flagPrompt REST mutation function (adds flag:review label)
  - useComments composable with cache-read + postCommentMutation
  - useFlagPrompt composable with flagMutation
  - ReactionBar.vue component with 3 emoji toggles, optimistic updates, sign-in CTA
  - CommentSection.vue with comment list, post form, flag button, sign-in CTA
  - PromptDetail.vue wired with ReactionBar + CommentSection

affects:
  - 03-03-user-profiles
  - future: moderation, notification features

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useMutation wrapping REST calls with onSuccess query invalidation
    - Auth guard pattern: isAuthenticated check before mutation, inline CTA on failure
    - Comments sourced from Prompt cache (no separate query)

key-files:
  created:
    - src/composables/queries/useComments.ts
    - src/composables/queries/useFlagPrompt.ts
    - src/components/prompt/ReactionBar.vue
    - src/components/prompt/CommentSection.vue
  modified:
    - src/lib/github/mutations.ts
    - src/composables/queries/useComments.spec.ts
    - src/composables/queries/useFlagPrompt.spec.ts
    - src/composables/queries/usePromptDetail.ts
    - src/types/index.ts
    - src/components/prompt/PromptDetail.vue

key-decisions:
  - "CommentNode interface exported from src/types/index.ts (not local to usePromptDetail) — shared between composable and component"
  - "comments array on Prompt populated in usePromptDetail from issue.comments.nodes (no separate query)"
  - "Flag confirmation uses window.confirm() — no Dialog component (per plan spec, keep simple)"
  - "Sign-in CTA rendered as inline div on click (not Tooltip/Dialog) to keep reaction bar lightweight"

patterns-established:
  - "useMutation composables: mutationFn calls REST, onSuccess invalidates ['prompt', issueId.value]"
  - "Auth guard: check authStore.isAuthenticated before mutation, show CTA on negative"
  - "toRef(props.prompt, 'fieldName') for passing reactive Prompt fields to composables"

requirements-completed: [COMM-03, COMM-04, COMM-05, COMM-06]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 3 Plan 02: Community Comments, Reactions UI, and Flagging Summary

**ReactionBar and CommentSection Vue components with postComment/flagPrompt REST mutations, optimistic reaction toggles, auth-guarded post/flag actions, and full wiring into PromptDetail**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-15T08:18:26Z
- **Completed:** 2026-03-15T08:21:26Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- postComment (COMM-03) and flagPrompt (COMM-06) REST functions added to mutations.ts
- useComments and useFlagPrompt composables with TDD coverage (5 tests, 2 spec files)
- ReactionBar.vue: 3 emoji toggles with counts, viewerHasReacted ring styling, auth CTA on unauthenticated click
- CommentSection.vue: comment list with avatars + timestamps, post form (authenticated), flag button with confirm, sign-in CTA (unauthenticated)
- PromptDetail.vue wired with both components — social interaction layer complete

## Task Commits

1. **Task 1: postComment/flagPrompt mutations + composables** - `0af95cd` (feat)
2. **Task 2: ReactionBar, CommentSection, PromptDetail wiring** - `775705f` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 followed TDD flow — spec written first (RED), then implementation (GREEN)_

## Files Created/Modified

- `src/lib/github/mutations.ts` - Added postComment and flagPrompt REST functions
- `src/types/index.ts` - Added CommentNode interface; added comments field to Prompt
- `src/composables/queries/useComments.ts` - Cache-read composable + postCommentMutation
- `src/composables/queries/useComments.spec.ts` - 3 tests: call args, invalidation, cache read
- `src/composables/queries/useFlagPrompt.ts` - flagMutation with invalidation on success
- `src/composables/queries/useFlagPrompt.spec.ts` - 2 tests: call args, invalidation
- `src/composables/queries/usePromptDetail.ts` - Populate comments from issue.comments.nodes
- `src/components/prompt/ReactionBar.vue` - Emoji reaction bar with auth guard
- `src/components/prompt/CommentSection.vue` - Comment list + post form + flag button
- `src/components/prompt/PromptDetail.vue` - Wire ReactionBar + CommentSection

## Decisions Made

- `CommentNode` exported from `src/types/index.ts` rather than kept local to usePromptDetail — shared by composables and components needing the type
- Comments are read from the Prompt cache (already loaded by usePromptDetail) rather than fetching a separate query — simpler and avoids double fetch
- `window.confirm()` for flag confirmation per plan spec — no Dialog overhead needed
- Inline sign-in CTA div (not Tooltip) in ReactionBar — sufficient for guidance without heavyweight component

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full social interaction layer complete: reactions (03-01), comments, flagging (03-02)
- Ready for Phase 03-03: user profiles (useUserProfile composable + ProfileView)
- Pre-existing uncommitted files (useUserProfile.ts, useBookmarksStore.ts) from 03-01 session are in working directory — 03-03 should pick these up

---
*Phase: 03-community-and-profiles*
*Completed: 2026-03-15*
