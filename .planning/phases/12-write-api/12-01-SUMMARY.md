---
phase: 12-write-api
plan: "01"
subsystem: testing
tags: [vitest, hono, tdd, write-api, cloudflare-workers, d1]

# Dependency graph
requires:
  - phase: 11-read-api
    provides: "spec patterns, seeded IDs, JWT mint pattern, request() helper, test-setup infrastructure"
provides:
  - "RED test contracts for all 11 write API requirements (API-11 through API-21)"
  - "35 failing tests locking behavioral expectations before any implementation"
  - "write.spec.ts covering prompts CRUD, versions, comments, reactions, bookmarks, notifications"
affects: [12-write-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED: spec-only file with all tests failing against stubs/404s"
    - "Three JWT tokens per test file: user (author), maintainer, fake non-author for 403 coverage"
    - "Sequential test ordering: POST to create resource, capture ID, then test DELETE/403 flows"

key-files:
  created:
    - src/workers/api/routes/write.spec.ts
  modified: []

key-decisions:
  - "fakeUserToken minted with FAKE_USER_ID (not seeded) for non-author/non-maintainer 403 tests"
  - "DELETE /comments tests sequence: POST comment first within test to get real ID, then test 403/204"
  - "DELETE /prompts tests use separate seeded prompts (ID 02, 03) to avoid test ordering conflicts with ID 01"
  - "API-21 401 test expects 401 — implementation must check auth before route existence"
  - "Reaction 409 test conditionally checks: first POST may be 201 or 409 depending on prior test state"

patterns-established:
  - "Three-token pattern: jwtToken (author), maintainerToken (maintainer), fakeUserToken (non-author) — cover all auth tiers"
  - "Sequential resource creation in test for dependent delete tests (API-17, API-19, API-20)"

requirements-completed: [API-11, API-12, API-13, API-14, API-15, API-16, API-17, API-18, API-19, API-20, API-21]

# Metrics
duration: 2min
completed: "2026-05-08"
---

# Phase 12 Plan 01: Write API RED Test Contracts Summary

**35 failing RED test contracts across all 11 write endpoints (API-11 to API-21) using three JWT tokens to cover author, maintainer, and non-author auth tiers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T16:09:15Z
- **Completed:** 2026-05-08T16:11:27Z
- **Tasks:** 2 (combined into single spec file)
- **Files modified:** 1

## Accomplishments

- Created `write.spec.ts` with 35 failing tests covering all 11 Phase 12 write requirements
- Established three-token JWT pattern (author user, maintainer, fake non-author) for complete 401/403 coverage
- Sequential test flows for stateful tests: POST comment to get ID, then test DELETE 403/204 on that real ID
- All tests failing at RED state — no write handlers exist yet

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: RED spec contracts for API-11 through API-21** - `dc38493` (test)

**Plan metadata:** (final docs commit follows)

## Files Created/Modified

- `src/workers/api/routes/write.spec.ts` - 35 RED test contracts for all 11 write requirements

## Decisions Made

- fakeUserToken minted with FAKE_USER_ID (not seeded in D1) to test 403 on non-author/non-maintainer paths without polluting the test users
- DELETE /prompts tests use prompt IDs 02 and 03 (not 01) so the 403 test against SEEDED_PROMPT_ID = 01 isn't affected by earlier deletion tests
- DELETE /comments/:id tests sequence POST first within the test to create a real comment ID, avoiding hardcoded IDs that may not exist
- API-21 notify 401 test expects 401 — implementation must place requireAuth() before route-not-found handling (bookmarks and notifications routes not yet mounted, so they 404 currently)
- Reaction 409 duplicate test conditionally handles first-POST being 201 or 409 depending on whether prior test already added that emoji

## Deviations from Plan

None - plan executed exactly as written. Both tasks combined into a single spec file creation as planned.

## Issues Encountered

- `/bookmarks` route not mounted in index.ts — tests correctly get 404 instead of 401, which is RED (failing) as required. Phase 12 implementation plans will mount the bookmarks route.
- `POST /notifications/:id/read` sub-route not yet added to notifications.ts — tests correctly get non-401 responses (route not found or non-JSON), confirming RED state.

## Next Phase Readiness

- write.spec.ts is locked with behavioral contracts for all 11 write endpoints
- Plans 12-02 through 12-04 implement handlers that turn these tests GREEN
- No blockers — RED state is the correct outcome for this plan

---
*Phase: 12-write-api*
*Completed: 2026-05-08*
