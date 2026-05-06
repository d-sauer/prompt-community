---
phase: 11-read-api
plan: "04"
subsystem: api
tags: [search, fts5, notifications, labels, hono, drizzle, d1]
dependency_graph:
  requires:
    - "11-01: test scaffolds for search and notifications"
    - "09-04: prompts_fts FTS5 virtual table and sync triggers"
    - "10-03: requireAuth middleware"
  provides:
    - "GET /search: FTS5 full-text search returning same shape as GET /prompts"
    - "GET /labels: taxonomy grouped by prefix with Cache-Control header"
    - "GET /notifications: auth-protected paginated notifications"
  affects:
    - "src/workers/api/index.ts: /notifications route mounted"
    - "scripts/seed.sql: comment semicolons fixed for test SQL splitter"
tech_stack:
  added:
    - "hono/trailing-slash: trimTrailingSlash middleware for route normalization"
  patterns:
    - "Raw D1 c.env.DB.prepare() for FTS5 MATCH queries (Drizzle cannot query virtual tables)"
    - "Cursor pagination on all list endpoints: id > cursor ORDER BY id ASC LIMIT limit+1"
    - "requireAuth() middleware applied per-route (not globally) on notifications"
key_files:
  created:
    - src/workers/api/routes/notifications.ts
  modified:
    - src/workers/api/routes/search.ts
    - src/workers/api/index.ts
    - scripts/seed.sql
decisions:
  - "Used raw D1 prepare() for FTS5 MATCH queries — Drizzle ORM cannot query FTS5 virtual tables"
  - "GET /labels grouped by prefix in JS (not SQL GROUP BY) — simple and consistent with other JS aggregation patterns in codebase"
  - "Seed SQL semicolons in comments fixed to prevent naive split(;) test splitter from executing comment fragments"
  - "trimTrailingSlash middleware added to all route files to normalize /prompts/ /users/ /search/ trailing slash variants"
metrics:
  duration: "8 min"
  completed: "2026-05-06T19:22:25Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 11 Plan 04: Search, Labels, and Notifications Summary

FTS5 full-text search, grouped labels endpoint, and auth-protected notifications implemented — all 6 search tests and 3 notifications tests GREEN.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement GET /search (FTS5) and GET /labels in search.ts | 402314c | search.ts, seed.sql, prompts.ts, users.ts, test-setup.ts, vitest.global-setup.ts |
| 2 | Create notifications.ts and mount in index.ts | 4bf9855 | notifications.ts, index.ts |

## Decisions Made

1. **Raw D1 for FTS5**: Drizzle ORM cannot query FTS5 virtual tables — used `c.env.DB.prepare()` with raw SQL for all FTS5 MATCH queries.

2. **Labels grouped in JS**: `GET /labels` queries the labels table via Drizzle, then groups by `prefix` field in JavaScript. Returns `{ categories, models, difficulties, tags }` shape as specified.

3. **Seed SQL comment fix**: `scripts/seed.sql` had semicolons inside SQL comments (e.g., `-- Re-runnable safely; will not duplicate rows.`). The test-setup.ts splits on `;` to execute statements, causing the fragment after the semicolon in a comment to be executed as SQL. Fixed by replacing `;` in comments with `,` or parentheses — no behavior change, idempotent fix.

4. **trimTrailingSlash middleware**: The boot test (`index.spec.ts`) hits routes with trailing slash (e.g., `/prompts/`). With real route implementations replacing the `app.all('*', 501)` stub, trailing slash paths returned 404. Added `trimTrailingSlash()` from `hono/trailing-slash` to normalize these.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Seed SQL comment semicolons broke test SQL splitter**
- **Found during:** Task 1 verification
- **Issue:** `scripts/seed.sql` line 3: `-- Re-runnable safely; will not duplicate rows.` — the `;` inside the comment caused the `split(';')` in test-setup.ts to produce `will not duplicate rows.` as an SQL statement, which D1 rejected
- **Fix:** Replaced `;` with `,` or parentheses in comment lines in seed.sql
- **Files modified:** scripts/seed.sql
- **Commit:** 402314c (included in Task 1 commit)

**2. [Rule 1 - Bug] index.spec.ts boot test failed on trailing slash routes**  
- **Found during:** Final verification
- **Issue:** Boot test hits `/prompts/`, `/users/`, `/search/` with trailing slash. Real route handlers (replacing `app.all('*', 501)`) don't match trailing slash variants, returning 404
- **Fix:** Added `trimTrailingSlash()` middleware to prompts.ts, users.ts, and search.ts
- **Files modified:** routes/search.ts, routes/prompts.ts, routes/users.ts  
- **Commit:** 010140e

## Verification Results

All Phase 11 specs GREEN:
```
Test Files  5 passed (5)
Tests       43 passed (43)
```

- `search.spec.ts` — 6 tests: FTS5 MATCH, input validation, response shape
- `notifications.spec.ts` — 3 tests: 401 without cookie, 200 with valid JWT, shape contract
- `prompts.spec.ts` — 17 tests (pre-existing Plan 11-02 implementation)
- `users.spec.ts` — 8 tests (pre-existing Plan 11-03 implementation)
- `index.spec.ts` — 9 boot tests: all routes registered, DB binding present

## Self-Check: PASSED

- notifications.ts: FOUND
- search.ts: FOUND
- 11-04-SUMMARY.md: FOUND
- Commit 402314c (Task 1): FOUND
- Commit 4bf9855 (Task 2): FOUND
