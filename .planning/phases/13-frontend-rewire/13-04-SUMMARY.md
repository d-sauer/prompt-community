---
phase: 13-frontend-rewire
plan: "04"
subsystem: ui
tags: [typescript, vue, tanstack-query, ulid, pinia, offline-queue]

# Dependency graph
requires:
  - phase: 13-frontend-rewire
    plan: "01"
    provides: "apiFetch wrapper, @/lib/api/mutations with all write functions (no token params)"
provides:
  - "useComments: post/delete comments via @/lib/api/mutations, string issueId"
  - "useReactions: add/remove reactions via @/lib/api/mutations, promptId-only (nodeId dropped), toApiEmoji helper"
  - "useOfflineQueue: QueuedAction.promptId:string (was issueNumber:number), drainQueue() no token, legacy v1 flush guard"
  - "useCreatePrompt: createPrompt() with structured fields, no token, onSuccess navigates to prompt.id ULID"
  - "useUpdatePrompt: UpdatePromptInput.promptId:string, updatePrompt()+createVersion(), no token"
  - "useFlagPrompt: flagPrompt() stub, string promptId, no token"
  - "useRestoreVersion: restoreVersion() with string promptId, no token, no manual version tracking"
affects:
  - "13-05-PLAN (component migration — callers of these composables)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "No token params on any mutation composable — cookie-based auth via credentials:include is automatic"
    - "Offline queue uses ULID string promptId — legacy integer issueNumber items flushed on first drain"
    - "toApiEmoji helper maps ReactionContent enum to lowercase API string"
    - "drainQueue() auto-triggers on reconnect via watch(isOnline) in useOfflineQueue"

key-files:
  created: []
  modified:
    - src/composables/queries/useComments.ts
    - src/composables/queries/useReactions.ts
    - src/composables/queries/useOfflineQueue.ts
    - src/composables/queries/useOfflineQueue.spec.ts
    - src/composables/queries/useCreatePrompt.ts
    - src/composables/queries/useUpdatePrompt.ts
    - src/composables/queries/useFlagPrompt.ts
    - src/composables/queries/useRestoreVersion.ts
    - src/App.vue

key-decisions:
  - "drainQueue() takes no arguments — cookie-based auth removes the token pass-through pattern"
  - "Legacy v1 flush guard checks 'issueNumber' in action at drain time — one-time safe migration for existing queues"
  - "App.vue drain-on-reconnect logic moved into useOfflineQueue watch(isOnline) watcher — collocated with queue management"
  - "buildLabels and buildFrontmatter removed from mutation composables — API accepts structured fields directly"
  - "UpdatePromptInput.versionNumber and newVersionNumber removed — API auto-increments version numbers"
  - "useRestoreVersion RestoreVariables drops newVersionNumber — API handles auto-increment internally"

patterns-established:
  - "Mutation composables import exclusively from @/lib/api/mutations — no @/lib/github imports"
  - "Offline enqueue shape: { type, promptId: string, payload } — string IDs throughout"

requirements-completed: [FRONT-08, FRONT-10]

# Metrics
duration: 7min
completed: 2026-05-08
---

# Phase 13 Plan 04: Mutation Composables Migration Summary

**All 7 mutation composables migrated from @/lib/github to @/lib/api/mutations — no token params, string ULID IDs, legacy queue flush guard**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-08T18:34:18Z
- **Completed:** 2026-05-08T18:41:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Migrated useComments, useReactions, useOfflineQueue to @/lib/api/mutations (Task 1)
- Dropped `nodeId` parameter from useReactions — v2 reactions use promptId only
- Updated QueuedAction type: `promptId: string` replaces `issueNumber: number`
- Added legacy v1 flush guard in drainQueue() — safe migration for existing queues with integer IDs
- Removed token parameter from drainQueue() — cookie-based auth is fully automatic
- Migrated useCreatePrompt, useUpdatePrompt, useFlagPrompt, useRestoreVersion to @/lib/api/mutations (Task 2)
- Removed buildFrontmatter/buildLabels/YAML body building — API accepts structured fields directly
- Updated UpdatePromptInput.promptId: string (was issueNumber: number)
- Removed all `authStore.token` checks from mutation composables

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate useComments, useReactions, useOfflineQueue** - `fdffe71` (feat)
2. **Task 2: Migrate useCreatePrompt, useUpdatePrompt, useFlagPrompt, useRestoreVersion** - `21e0b68` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/composables/queries/useComments.ts` - @/lib/api/mutations import, string issueId, no token, promptId in enqueue
- `src/composables/queries/useReactions.ts` - @/lib/api/mutations import, promptId-only (nodeId dropped), toApiEmoji helper, no token
- `src/composables/queries/useOfflineQueue.ts` - @/lib/api/mutations import, QueuedAction.promptId:string, drainQueue() no args, legacy flush guard, watch triggers drain on reconnect
- `src/composables/queries/useOfflineQueue.spec.ts` - Updated to new API, string promptIds, added legacy flush guard tests, removed token-based assertions
- `src/composables/queries/useCreatePrompt.ts` - @/lib/api/mutations import, structured input (no frontmatter), no token, Prompt return type, navigate to prompt.id
- `src/composables/queries/useUpdatePrompt.ts` - @/lib/api/mutations import, promptId:string, updatePrompt()+createVersion(), no token, invalidates prompt-versions
- `src/composables/queries/useFlagPrompt.ts` - @/lib/api/mutations import, string promptId, no token
- `src/composables/queries/useRestoreVersion.ts` - @/lib/api/mutations import, string promptId, no token, auto-increment versions
- `src/App.vue` - Removed token-based drainQueue calls (drain logic now in useOfflineQueue watcher)

## Decisions Made
- `drainQueue()` takes no arguments — the token pass-through pattern is completely removed; cookie handles auth automatically
- Legacy v1 flush guard uses `'issueNumber' in a` runtime check — identifies and discards old integer-ID queue items silently before processing
- App.vue drain-on-reconnect logic moved into `useOfflineQueue` watch watcher — collocates queue lifecycle management
- `buildLabels` and `buildFrontmatter` removed from mutation composables — the v2 API accepts structured `{ title, body, tags, category, model, difficulty }` directly; YAML frontmatter is frontend-only display concern
- `UpdatePromptInput.versionNumber` removed — v2 API auto-increments version numbers in DB
- `useRestoreVersion.RestoreVariables.newVersionNumber` removed — same API auto-increment reason

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated App.vue to remove token-based drainQueue calls**
- **Found during:** Task 1 (useOfflineQueue migration)
- **Issue:** App.vue called `drainQueue(token)` and `drainQueue(authStore.token)` — after removing the token parameter, these calls would cause TypeScript errors
- **Fix:** Removed the drain-on-auth-change and drain-on-reconnect watchers from App.vue. Reconnect drain is now handled internally by useOfflineQueue's own `watch(isOnline)` watcher. Auth-change drain is no longer needed since cookie is sent automatically.
- **Files modified:** src/App.vue
- **Verification:** App.vue has no drainQueue calls; useOfflineQueue watcher handles reconnect drain
- **Committed in:** fdffe71 (Task 1 commit)

**2. [Rule 3 - Blocking] Updated useOfflineQueue.spec.ts to match new interface**
- **Found during:** Task 1 (useOfflineQueue migration)
- **Issue:** Spec file mocked `@/lib/github/mutations` and called `drainQueue('token')` — would fail after interface change
- **Fix:** Updated mock to `@/lib/api/mutations`, changed all `issueNumber` to `promptId` with string values, removed token args from drainQueue calls, added two new tests for legacy flush guard behavior
- **Files modified:** src/composables/queries/useOfflineQueue.spec.ts
- **Verification:** Spec tests updated to match new API surface
- **Committed in:** fdffe71 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking issues from interface change)
**Impact on plan:** Both fixes essential for TypeScript correctness and test validity. No scope creep.

## Issues Encountered
None beyond the two auto-fixes documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 mutation composables fully migrated to @/lib/api/mutations
- Plan 05 (component migration) can now begin — components that call these composables will have TypeScript errors from the updated interfaces (issueNumber → promptId, nodeId dropped, etc.) which Plan 05 resolves
- etag.ts is NOT deleted — FRONT-10 partially satisfied; file deletion is DECOM-04 in Phase 15 per CONTEXT.md locked decision

---
*Phase: 13-frontend-rewire*
*Completed: 2026-05-08*

## Self-Check: PASSED

- FOUND: src/composables/queries/useComments.ts
- FOUND: src/composables/queries/useReactions.ts
- FOUND: src/composables/queries/useOfflineQueue.ts
- FOUND: src/composables/queries/useCreatePrompt.ts
- FOUND: src/composables/queries/useUpdatePrompt.ts
- FOUND: src/composables/queries/useFlagPrompt.ts
- FOUND: src/composables/queries/useRestoreVersion.ts
- FOUND: fdffe71 (Task 1 commit)
- FOUND: 21e0b68 (Task 2 commit)
- FOUND: 13-04-SUMMARY.md
