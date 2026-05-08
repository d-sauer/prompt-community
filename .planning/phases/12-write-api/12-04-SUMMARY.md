---
phase: 12-write-api
plan: 04
subsystem: api
tags: [hono, drizzle, d1, comments, reactions, notifications, soft-delete]

# Dependency graph
requires:
  - phase: 12-01
    provides: RED test contracts for all write API endpoints in write.spec.ts
  - phase: 11-read-api
    provides: GET handlers in prompts.ts and comments.ts stub

provides:
  - POST /prompts/:id/comments with auth, body validation, and notification side-effect (API-16)
  - DELETE /comments/:id soft-delete (sets deleted_at) with author/maintainer authorization (API-17)
  - POST /prompts/:id/reactions with emoji validation, 409 on duplicate, notification, and count response (API-18)
  - DELETE /prompts/:id/reactions by emoji identifier in request body (API-19)

affects: [12-05, 13-notifications, frontend-comments-ui, frontend-reactions-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft-delete pattern: UPDATE SET deleted_at = strftime() instead of hard DELETE"
    - "DrizzleQueryError cause-chain inspection for D1 UNIQUE constraint 409 handling"
    - "Notification side-effect pattern: skip if actor.id === prompt.author_id"
    - "Reaction emoji validation via readonly const array + includes() guard"

key-files:
  created:
    - src/workers/api/routes/comments.ts
  modified:
    - src/workers/api/routes/prompts.ts
    - scripts/seed.sql

key-decisions:
  - "DrizzleQueryError wraps D1 errors — check both String(e) and String(e.cause) for UNIQUE/SQLITE_CONSTRAINT to detect 409"
  - "fakeUserToken user (FAKE0000000000000000000001) seeded in seed.sql — FK constraint prevents reactions from unseeded users, reaction add+remove test requires real DB row"
  - "DELETE /prompts/:id/reactions uses request body (not path param) for emoji identifier — Hono supports c.req.json() for DELETE requests"
  - "Notification comment_id set to null for reaction_added events (comment_id only relevant for comment_added)"

patterns-established:
  - "Soft-delete pattern: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` for deleted_at"
  - "Reaction UNIQUE 409: try/catch with cause-chain string check for Drizzle-wrapped D1 errors"
  - "Notification insert pattern: conditional on actor !== prompt.author_id, with type/prompt_id/comment_id fields"

requirements-completed: [API-16, API-17, API-18, API-19]

# Metrics
duration: 8min
completed: 2026-05-08
---

# Phase 12 Plan 04: Comments and Reactions Write API Summary

**POST/DELETE /comments and POST/DELETE /reactions handlers with soft-delete, emoji validation, duplicate 409, and notification side-effects**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-08T16:13:11Z
- **Completed:** 2026-05-08T16:21:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented POST /prompts/:id/comments creating a comment with 201 + notification insert for prompt author (skipping self-notifications)
- Implemented DELETE /comments/:id soft-deleting by setting deleted_at, with 403 for non-author/non-maintainer
- Implemented POST /prompts/:id/reactions with emoji validation, UNIQUE constraint 409, notification side-effect, and reaction_counts response
- Implemented DELETE /prompts/:id/reactions removing by emoji from request body, 404 if not found
- All 35 write.spec.ts tests GREEN; 17 prompts.spec.ts tests remain GREEN (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Implement comments and reactions write handlers** - `be0e468` (feat)

**Plan metadata:** (pending final docs commit)

_Note: Tasks 1 and 2 both modified prompts.ts in a single coherent edit; committed together._

## Files Created/Modified
- `src/workers/api/routes/comments.ts` - Replaced 501 stub with DELETE /:id soft-delete handler
- `src/workers/api/routes/prompts.ts` - Added POST /:id/comments, POST /:id/reactions, DELETE /:id/reactions handlers
- `scripts/seed.sql` - Added fake-user row required for FK-safe reaction test round-trip

## Decisions Made
- `DrizzleQueryError` wraps D1 errors — must check both `String(e)` and `String(e.cause)` for UNIQUE/SQLITE_CONSTRAINT strings to properly detect 409 duplicate reactions
- `fakeUserToken` user seeded in `seed.sql`: reaction insert has an FK on `user_id`; without a real row the add+delete test fails with FK error
- DELETE /prompts/:id/reactions reads emoji from request body (not path param); Hono supports `c.req.json()` for DELETE requests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added fake-user to seed.sql for FK-safe reaction test**
- **Found during:** Task 2 (POST /prompts/:id/reactions implementation)
- **Issue:** write.spec.ts "returns 204 on successful reaction removal" test uses fakeUserToken (FAKE_USER_ID = 'FAKE0000000000000000000001') to add then remove a reaction; reactions.user_id has an FK constraint; user not in DB causes FK error on insert
- **Fix:** Added `('FAKE0000000000000000000001', 999003, 'fake-user', 'Fake User', 'user')` to seed.sql
- **Files modified:** scripts/seed.sql
- **Verification:** 35/35 write.spec.ts tests pass
- **Committed in:** be0e468 (Task 1+2 commit)

**2. [Rule 1 - Bug] Fixed DrizzleQueryError cause-chain for 409 detection**
- **Found during:** Task 2 (POST /prompts/:id/reactions — 409 test)
- **Issue:** `String(drizzleError)` only shows `DrizzleQueryError: Failed query: ...` — the UNIQUE constraint message is in `e.cause`, not the top-level error string
- **Fix:** Updated catch block to check `String(e)` and `String(e.cause)` for both 'UNIQUE' and 'SQLITE_CONSTRAINT'
- **Files modified:** src/workers/api/routes/prompts.ts
- **Verification:** 409 duplicate reaction test passes
- **Committed in:** be0e468 (Task 1+2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes required for correct test behavior. No scope creep.

## Issues Encountered
- Plans 02 and 03 (API-11–15) were already partially implemented in prompts.ts but not committed; this plan added API-16/18/19 to the existing uncommitted state cleanly.

## Next Phase Readiness
- API-16, API-17, API-18, API-19 complete and GREEN
- Plan 12-05 (bookmarks + notifications mark-read) can proceed — bookmarks.ts already exists from uncommitted Plan 05 work
- Comments write endpoint enables frontend comment submission UI

---
*Phase: 12-write-api*
*Completed: 2026-05-08*
