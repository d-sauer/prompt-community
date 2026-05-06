---
phase: 11-read-api
plan: 03
subsystem: api
tags: [hono, drizzle-orm, d1, cloudflare-workers, vitest, tdd, pagination, cursor]

# Dependency graph
requires:
  - phase: 11-read-api
    plan: 01
    provides: RED test scaffolds for users.spec.ts (8 tests covering GET /users/:login, /prompts, /activity)
  - phase: 10-auth-migration
    provides: Env type, UserContext type, optionalAuth/requireAuth middleware
  - phase: 09-backend-foundation
    provides: Drizzle schema (users, prompts, prompt_tags, reactions, comments tables), D1 migrations, seed data
provides:
  - GET /users/:login — public profile from D1 by github_login, 404 on unknown login
  - GET /users/:login/prompts — paginated published prompts with tags, reaction_counts, comment_count
  - GET /users/:login/activity — paginated prompt_created events derived from published prompts
  - All three endpoints are fully public (no auth required)
affects: [11-read-api plan-04, 13-frontend-rewire]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drizzle inArray() for multi-prompt tag/reaction/comment fetching — same pattern as plan-02"
    - "In-JS aggregation: fetch related rows, sort into Maps keyed by prompt_id, map to response"
    - "ULID cursor pagination: WHERE id < cursor ORDER BY id DESC LIMIT n+1, JS sort, slice"
    - "User resolve first: GET /login -> 404 check -> then query prompts with author_id = user.id"

key-files:
  created: []
  modified:
    - src/workers/api/routes/users.ts

key-decisions:
  - "Activity feed derives from prompts (status=published, author_id=user.id) not a separate activity_log table — keeps schema lean"
  - "In-JS sorting for DESC ULID order — Drizzle.desc() import not used; sort() on ULID strings is correct since ULIDs are lexicographically time-ordered"
  - "inArray() from drizzle-orm used for multi-ID WHERE IN clause — column.in() is not a valid Drizzle API"
  - "Users router: /:login registered before /:login/prompts and /:login/activity — Hono correctly routes single-segment vs multi-segment paths"

patterns-established:
  - "User resolution gate: all sub-resource endpoints resolve the user first and return 404 if not found before running the sub-resource query"
  - "Activity feed pattern: prompt_created events mapped from prompts query — no separate event table needed for v2.0"

requirements-completed: [API-06, API-07, API-08]

# Metrics
duration: 8min
completed: 2026-05-06
---

# Phase 11 Plan 03: User Profile & Activity Endpoints Summary

**Three public GET handlers in users.ts replacing the 501 stub: real D1 profile lookup, paginated published-prompts list with full PromptSummary shape, and paginated prompt_created activity feed**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-06T19:14:21Z
- **Completed:** 2026-05-06T19:22:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Implemented GET /users/:login returning { id, login, name, avatar_url, role, created_at } from D1, 404 on unknown login
- Implemented GET /users/:login/prompts with cursor-based pagination, only published prompts, full PromptSummary shape (tags, reaction_counts, comment_count, author)
- Implemented GET /users/:login/activity deriving prompt_created events from the prompts table (no separate activity log table)
- All 8 tests in users.spec.ts GREEN; TypeScript compiles without errors

## Task Commits

Implementation included in combined commit with plans 02 and 04:

1. **Task 1: GET /users/:login (public profile)** - `402314c` (feat(11-04): implement GET /search (FTS5) and GET /labels in search.ts — included users.ts 11-03)
2. **Task 2: GET /users/:login/prompts and GET /users/:login/activity** - `402314c` (same commit)

_Note: Plans 02, 03, and 04 implementations were committed together in a single wave-2 commit._

## Files Created/Modified
- `src/workers/api/routes/users.ts` - Three GET handlers replacing 501 stub: /:login (profile), /:login/prompts (paginated), /:login/activity (feed)

## Decisions Made
- Activity feed derives from prompts table directly (status=published, author_id=user.id) — no separate activity_log table needed for v2.0 scope
- `inArray()` from drizzle-orm used for multi-prompt WHERE IN clause (column.in() is not a valid Drizzle API)
- ULID sort done in JS after fetch (b.id.localeCompare(a.id)) since ULIDs are lexicographically time-ordered — simple and correct
- User resolver pattern applied to all sub-resource endpoints: resolve user by github_login first, 404 if missing, then query sub-resource with user.id

## Deviations from Plan

None — plan executed exactly as written. The inArray() correction was discovered during TypeScript type-check (column.in() doesn't exist), fixed inline before tests ran.

## Issues Encountered
- Initial attempt used `column.in(promptIds)` which TypeScript rejected (TS2339: Property 'in' does not exist). Fixed to `inArray(column, promptIds)` from drizzle-orm — standard Drizzle API.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three user public endpoints are live and tested
- GET /prompts (plan-02) and GET /search + GET /labels (plan-04) are also complete
- Phase 11 implementation complete — all public read API endpoints working
- Ready for Phase 12 (write API) or Phase 13 (frontend rewire to use new API)

---
*Phase: 11-read-api*
*Completed: 2026-05-06*
