---
phase: 14-admin-moderation-api
plan: "03"
subsystem: ui
tags: [vue, tanstack-query, composables, admin, moderation, apiFetch]

# Dependency graph
requires:
  - phase: 14-admin-moderation-api
    plan: "02"
    provides: Working admin API handlers (GET /queue, /log, /stats, POST /approve, /hide, label CRUD)
  - phase: 13-frontend-rewire
    provides: apiFetch pattern, cookie-based auth, no-token composable pattern
provides:
  - src/lib/api/admin.ts with 8 typed apiFetch wrappers (getAdminQueue, getAdminLog, getAdminStats, approvePrompt, hidePrompt, createLabel, updateLabel, deleteLabel)
  - Five admin composables fully rewired to backend API — zero @/lib/github/* imports
  - All five composable spec files mocking @/lib/api/admin and passing GREEN
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin API module: src/lib/api/admin.ts follows same apiFetch wrapper pattern as queries.ts/mutations.ts"
    - "featureMutation kept as exported stub (throws error) — preserves AdminQueueTab.vue compat without v2 endpoint"
    - "getLabels stays in queries.ts (public endpoint); label write functions in admin.ts (admin-only)"
    - "vi.mock factories must be self-contained — no references to outer-scope variables due to Vitest hoisting"

key-files:
  created:
    - src/lib/api/admin.ts
  modified:
    - src/composables/queries/useAdminQueue.ts
    - src/composables/queries/useAdminQueue.spec.ts
    - src/composables/queries/useAdminActions.ts
    - src/composables/queries/useAdminActions.spec.ts
    - src/composables/queries/useAdminLog.ts
    - src/composables/queries/useAdminLog.spec.ts
    - src/composables/queries/useAdminLabels.ts
    - src/composables/queries/useAdminLabels.spec.ts
    - src/composables/queries/useAdminStats.ts
    - src/composables/queries/useAdminStats.spec.ts

key-decisions:
  - "featureMutation stubbed as error-throw not removed — AdminQueueTab.vue references it; no v2 featured status in D1 enum"
  - "FlaggedIssue interface drops 'number' field — v2 uses ULID string id; AdminQueueTab.vue uses Set<string> ids after rewire"
  - "useAdminLabels groupedLabels computed re-groups from getLabels() response — getLabels() returns grouped shape; labels re-flattened then re-grouped by prefix for admin UI"
  - "useAdminStats drops 'featured' computed ref — no featured status in v2 D1 enum"

patterns-established:
  - "Pattern: vi.mock factory literals only — no outer-scope const references inside vi.mock(() => {...}); use inline literals to avoid Vitest hoisting ReferenceError"

requirements-completed: [FRONT-06]

# Metrics
duration: 3min
completed: 2026-05-08
---

# Phase 14 Plan 03: Frontend Admin Rewire Summary

**Five admin composables fully rewired from GitHub GraphQL to v2 REST backend — src/lib/api/admin.ts created with 8 typed apiFetch wrappers; zero @/lib/github/* imports remain in any admin composable**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-08T21:34:25Z
- **Completed:** 2026-05-08T21:37:44Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created `src/lib/api/admin.ts` with typed apiFetch wrappers for all admin read (queue, log, stats) and write (approve, hide, label CRUD) endpoints
- Rewired all 5 admin composables (useAdminQueue, useAdminActions, useAdminLog, useAdminLabels, useAdminStats) from @/lib/github/* to @/lib/api/admin + @/lib/api/mutations
- Removed all GitHub-specific patterns: createGraphqlClient, useAuthStore.token, VITE_GITHUB_OWNER/REPO env vars, clearEtag, MODERATION_COMMENT_REGEX, postModerationComment
- All 5 composable spec files now mock @/lib/api/admin — 24 admin tests GREEN; full suite 177 jsdom + 127 workers tests GREEN — zero regressions

## Task Commits

1. **Task 1: Create src/lib/api/admin.ts** - `e30896b` (feat)
2. **Task 2: Rewire 5 admin composables + update their specs** - `1703222` (feat)

## Files Created/Modified

- `src/lib/api/admin.ts` — New file: 8 typed apiFetch wrappers + 4 exported interfaces
- `src/composables/queries/useAdminQueue.ts` — GraphQL removed; getAdminQueue from admin.ts; FlaggedIssue drops 'number'
- `src/composables/queries/useAdminQueue.spec.ts` — Mock updated to @/lib/api/admin; ULID id assertions
- `src/composables/queries/useAdminActions.ts` — approvePrompt/hidePrompt from admin.ts; deletePrompt from mutations; featureMutation stubbed
- `src/composables/queries/useAdminActions.spec.ts` — Mock updated to @/lib/api/admin + @/lib/api/mutations; id string assertions
- `src/composables/queries/useAdminLog.ts` — getAdminLog from admin.ts; structured LogEntry (no regex); date filter uses created_at
- `src/composables/queries/useAdminLog.spec.ts` — Mock updated to @/lib/api/admin; structured mockLogEntry
- `src/composables/queries/useAdminLabels.ts` — createLabel/updateLabel/deleteLabel from admin.ts; getLabels from queries; no clearEtag
- `src/composables/queries/useAdminLabels.spec.ts` — Mock updated to @/lib/api/admin + @/lib/api/queries; prefix/value param assertions
- `src/composables/queries/useAdminStats.ts` — getAdminStats from admin.ts; no featured computed ref
- `src/composables/queries/useAdminStats.spec.ts` — Mock updated to @/lib/api/admin; total+flagged only

## Decisions Made

- `featureMutation` kept as exported stub (throws `Error('feature action not available in v2')`) — AdminQueueTab.vue references this mutation; removing it would cause runtime crash; v2 D1 status enum has no 'featured' value
- `FlaggedIssue` interface drops `number: number` field — v2 uses ULID string ids; AdminQueueTab.vue uses string ids via Set<string>
- `getLabels()` stays in `queries.ts` (public read endpoint) — only label write functions live in `admin.ts`
- `useAdminStats` drops `featured` computed ref — no 'featured' status in v2 D1 prompt enum

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Vitest hoisting ReferenceError in 2 spec files**
- **Found during:** Task 2 verification (test run)
- **Issue:** `useAdminQueue.spec.ts` and `useAdminLog.spec.ts` referenced outer-scope `const` variables inside `vi.mock()` factories; Vitest hoists `vi.mock()` calls to top of file, before `const` declarations — causes `ReferenceError: Cannot access before initialization`
- **Fix:** Inlined literal objects directly inside `vi.mock()` factory functions (no outer-scope references)
- **Files modified:** src/composables/queries/useAdminQueue.spec.ts, src/composables/queries/useAdminLog.spec.ts
- **Verification:** All 24 admin composable tests GREEN after fix
- **Committed in:** 1703222 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix to unblock test run. No scope creep.

## Issues Encountered

None beyond the Vitest hoisting issue documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FRONT-06 complete: all admin composables consume v2 REST API exclusively — zero @/lib/github/* imports in admin composables
- Phase 14 complete: Admin API backend (plan-02) + frontend composables (plan-03) both done
- The admin panel is fully backed by the Hono/D1 backend
- Deferred: AdminQueueTab.vue may need UI updates for FlaggedIssue interface changes (no `number` field, `avatar_url` vs `avatarUrl`) — out of scope for this plan

## Self-Check: PASSED

- src/lib/api/admin.ts: FOUND
- useAdminQueue.ts: FOUND
- useAdminActions.ts: FOUND
- useAdminLog.ts: FOUND
- useAdminLabels.ts: FOUND
- useAdminStats.ts: FOUND
- Commit e30896b: FOUND
- Commit 1703222: FOUND

---
*Phase: 14-admin-moderation-api*
*Completed: 2026-05-08*
