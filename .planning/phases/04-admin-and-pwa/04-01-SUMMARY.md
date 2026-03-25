---
phase: 04-admin-and-pwa
plan: "01"
subsystem: api

tags: [github-api, octokit, graphql, rest, mutations, queries, admin, vitest]

# Dependency graph
requires:
  - phase: 03-community-and-profiles
    provides: mutations.ts and queries.ts base with createRestClient/createGraphqlClient patterns

provides:
  - addLabelToIssue, removeLabelFromIssue (REST label mutations on issues)
  - deleteIssueGraphQL (GraphQL deleteIssue mutation accepting node ID)
  - postModerationComment (standardised audit trail comment)
  - createRepoLabel, updateRepoLabel, deleteRepoLabel (repo label CRUD)
  - GET_ADMIN_STATS query string (total/flagged/featured counts)
  - GET_FLAGGED_ISSUES query string (paginated flag:review issues with node ID)
  - getRepoLabels REST helper (list repo labels)
  - getIssueComments REST helper (list issue comments for audit log)
  - Wave 0 spec stubs for 5 admin composables and router admin guard

affects:
  - 04-02 (admin composables import all these functions and spec stubs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin mutations follow existing owner()/repo() pattern with X-GitHub-Api-Version header"
    - "GraphQL node ID (base64) used for deleteIssueGraphQL — NOT integer issue number"
    - "Moderation comment format: ✓ {action} by @{login} on YYYY-MM-DD"
    - "Wave 0 spec stubs use it.todo() — compile with commented import until plan 02 creates composables"

key-files:
  created:
    - src/composables/queries/useAdminStats.spec.ts
    - src/composables/queries/useAdminQueue.spec.ts
    - src/composables/queries/useAdminActions.spec.ts
    - src/composables/queries/useAdminLabels.spec.ts
    - src/composables/queries/useAdminLog.spec.ts
  modified:
    - src/lib/github/mutations.ts
    - src/lib/github/queries.ts
    - src/router/index.spec.ts

key-decisions:
  - "deleteIssueGraphQL accepts GraphQL base64 node ID (id field from GET_FLAGGED_ISSUES) not integer issue number — enforces correct API contract with plan 02"
  - "getIssueComments defined in plan 01 (queries.ts) not plan 02 — prevents plan 02 from modifying queries.ts"
  - "Wave 0 spec stubs use it.todo() so they compile and run (as pending) before composables exist in plan 02"
  - "Router index.spec.ts already had real admin guard tests from phase 1; only todo stubs appended (not duplicated)"

patterns-established:
  - "Admin REST mutations: same owner()/repo()/X-GitHub-Api-Version pattern as existing flagPrompt"
  - "Admin GraphQL: createGraphqlClient(token) same as addReaction/removeReaction pattern"

requirements-completed:
  - ADMN-01
  - ADMN-02
  - ADMN-03
  - ADMN-04
  - ADMN-05
  - ADMN-06
  - ADMN-07
  - ADMN-08

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 4 Plan 01: Admin GitHub API Layer and Wave 0 Spec Stubs Summary

**7 admin mutation functions and 4 query exports added to GitHub API layer, plus 6 Wave 0 spec stub files scaffolding all admin composable behaviors for plan 02 TDD**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T06:03:57Z
- **Completed:** 2026-03-25T06:09:00Z
- **Tasks:** 2
- **Files modified:** 8 (2 modified, 6 created)

## Accomplishments

- Extended mutations.ts with 7 admin functions: addLabelToIssue, removeLabelFromIssue, deleteIssueGraphQL, postModerationComment, createRepoLabel, updateRepoLabel, deleteRepoLabel
- Extended queries.ts with GET_ADMIN_STATS, GET_FLAGGED_ISSUES query strings and getRepoLabels, getIssueComments REST helpers
- Created 5 Wave 0 admin spec stubs (useAdminStats, useAdminQueue, useAdminActions, useAdminLabels, useAdminLog) and appended router admin guard todo stubs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add admin mutation functions to mutations.ts** - `90e572b` (feat)
2. **Task 2: Add admin queries to queries.ts and create Wave 0 spec stubs** - `c152c10` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/lib/github/mutations.ts` - Appended 7 admin mutation functions (addLabelToIssue, removeLabelFromIssue, deleteIssueGraphQL, postModerationComment, createRepoLabel, updateRepoLabel, deleteRepoLabel)
- `src/lib/github/queries.ts` - Appended GET_ADMIN_STATS, GET_FLAGGED_ISSUES, getRepoLabels, getIssueComments
- `src/composables/queries/useAdminStats.spec.ts` - Wave 0 spec stub (2 todos)
- `src/composables/queries/useAdminQueue.spec.ts` - Wave 0 spec stub (3 todos)
- `src/composables/queries/useAdminActions.spec.ts` - Wave 0 spec stub (7 todos)
- `src/composables/queries/useAdminLabels.spec.ts` - Wave 0 spec stub (5 todos)
- `src/composables/queries/useAdminLog.spec.ts` - Wave 0 spec stub (4 todos)
- `src/router/index.spec.ts` - Appended router admin guard todo block (2 todos)

## Decisions Made

- deleteIssueGraphQL accepts GraphQL base64 node ID (from id field on GET_FLAGGED_ISSUES nodes) not integer issue number — avoids a class of bugs in plan 02 by enforcing correct contract at the API layer
- getIssueComments defined here (plan 01 owns queries.ts) so plan 02 can import it without modifying queries.ts
- Wave 0 stubs use it.todo() with import commented out — ensures stubs compile and Vitest reports them as pending (not errors) before composables exist
- Router index.spec.ts already had 4 real admin guard tests from phase 1 foundation; appended a separate describe block with 2 todos rather than duplicating existing coverage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (admin composables + UI) can import all functions directly from mutations.ts and queries.ts without modification
- All 6 Wave 0 spec stubs run cleanly (23 todos as pending) — plan 02 TDD can start immediately
- GET_FLAGGED_ISSUES includes the id field (GraphQL node ID) critical for deleteIssueGraphQL in plan 02

---
*Phase: 04-admin-and-pwa*
*Completed: 2026-03-25*

## Self-Check: PASSED

- mutations.ts: FOUND
- queries.ts: FOUND
- useAdminStats.spec.ts: FOUND
- useAdminQueue.spec.ts: FOUND
- useAdminActions.spec.ts: FOUND
- useAdminLabels.spec.ts: FOUND
- useAdminLog.spec.ts: FOUND
- index.spec.ts (router): FOUND
- Commit 90e572b: FOUND
- Commit c152c10: FOUND
