---
phase: 12-write-api
plan: 05
subsystem: api
tags: [hono, d1, drizzle, bookmarks, notifications, jwt]

# Dependency graph
requires:
  - phase: 12-write-api-01
    provides: "write.spec.ts RED test contracts for all write endpoints including API-20 and API-21"
  - phase: 11-read-api-04
    provides: "GET /notifications fully implemented; notifications.ts sub-app structure to extend"
  - phase: 09-backend-foundation
    provides: "D1 schema with bookmarks and notifications tables; Drizzle ORM patterns"
provides:
  - "POST /bookmarks — creates server-side D1 bookmark (idempotent: INSERT OR IGNORE)"
  - "DELETE /bookmarks/:promptId — removes bookmark (idempotent: 204 even if not found)"
  - "POST /notifications/:id/read — marks notification read_at; returns 200 with full updated notification"
  - "bookmarks.ts route file mounted at /bookmarks in index.ts"
affects: [13-frontend-rewire, bookmarks feature, notification badge]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onConflictDoNothing() for idempotent bookmark INSERT in Drizzle"
    - "sql template for raw SQLite strftime() in update set"
    - "Dual WHERE (id + user_id) for notification ownership check without revealing existence to unauthorized user"

key-files:
  created:
    - src/workers/api/routes/bookmarks.ts
  modified:
    - src/workers/api/routes/notifications.ts
    - src/workers/api/index.ts

key-decisions:
  - "POST /bookmarks uses onConflictDoNothing() for idempotent insert — returns 201 whether new or pre-existing bookmark"
  - "DELETE /bookmarks/:promptId returns 204 unconditionally (idempotent — no error if bookmark doesn't exist)"
  - "POST /notifications/:id/read uses combined WHERE id=:id AND user_id=:user_id — 404 for both unknown and other-user's notifications (do not reveal existence)"
  - "read_at update uses sql template with strftime('%Y-%m-%dT%H:%M:%fZ', 'now') for ISO8601 millisecond precision consistent with tsNow schema default"

patterns-established:
  - "Idempotent bookmark insert: db.insert(...).values(...).onConflictDoNothing() + immediate re-fetch"
  - "Notification ownership gate: WHERE id AND user_id — single query handles not-found and wrong-user cases"

requirements-completed: [API-20, API-21]

# Metrics
duration: 4min
completed: 2026-05-08
---

# Phase 12 Plan 05: Bookmarks and Notification Read Summary

**Hono bookmarks route (POST/DELETE) with D1 idempotent insert and soft-ownership notification read endpoint (POST /notifications/:id/read)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-08T16:14:03Z
- **Completed:** 2026-05-08T16:17:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `src/workers/api/routes/bookmarks.ts` from scratch with POST / and DELETE /:promptId handlers (API-20)
- Mounted bookmarks route at `/bookmarks` in index.ts after existing notifications route
- Added POST /:id/read handler to notifications.ts sub-app (API-21)
- All 6 target tests GREEN (4 bookmarks + 2 notifications read); GET /notifications still 3/3 passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bookmarks.ts route and mount in index.ts (API-20)** - `a9c1acb` (feat)
2. **Task 2: Implement POST /notifications/:id/read (API-21)** - `c2eaf90` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/workers/api/routes/bookmarks.ts` - New Hono sub-app: POST / (idempotent bookmark create) and DELETE /:promptId (idempotent bookmark remove)
- `src/workers/api/routes/notifications.ts` - Added POST /:id/read handler; added `sql` to drizzle-orm imports
- `src/workers/api/index.ts` - Added bookmarks import and `app.route('/bookmarks', bookmarks)` mount

## Decisions Made
- POST /bookmarks uses `onConflictDoNothing()` for idempotent insert — returns 201 regardless of whether bookmark was newly created or already existed, per plan's "INSERT OR IGNORE semantics"
- DELETE /bookmarks/:promptId returns 204 unconditionally — idempotent delete per plan spec
- POST /notifications/:id/read uses combined `WHERE id=:id AND user_id=:user_id` in a single query — this handles both the unknown-ID and wrong-user cases with a single 404 (no existence leakage)
- read_at update uses raw SQL `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')` template for millisecond-precision ISO8601 timestamps consistent with schema's tsNow default

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 2 pre-existing test failures in write.spec.ts (API-18 duplicate reaction, API-19 reaction delete) — these belong to plans 12-03/12-04 and were failing before this plan's changes. Out of scope per deviation scope boundary.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API-20 and API-21 complete; all bookmark and notification read endpoints live
- Phase 13 (frontend rewire) can now use POST /bookmarks + DELETE /bookmarks/:promptId for cross-device bookmark sync
- Phase 13 can use POST /notifications/:id/read for notification badge management

---
*Phase: 12-write-api*
*Completed: 2026-05-08*
