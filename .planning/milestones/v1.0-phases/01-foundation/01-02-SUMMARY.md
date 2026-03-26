---
phase: 01-foundation
plan: "02"
subsystem: auth
tags: [octokit, github-oauth, cloudflare-workers, vue-router, pinia, vitest, postmessage, csrf]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: "SPA skeleton with useAuthStore stub, router with verifyMaintainerStatus stub, worker with oauth.ts stub, Wave 0 test stubs"
provides:
  - Octokit client factory: createGraphqlClient(token?) and createRestClient(token)
  - verifyMaintainerStatus(token) calling GitHub REST /repos/.../collaborators/:username (204=true, 404=false)
  - Router /admin guard wired to GitHub API via verifyMaintainerStatus (not Pinia isMaintainer state read)
  - Full OAuth Worker test coverage: /login, /callback, state echo, CLIENT_SECRET not exposed
  - Full useAuthStore login() tests: popup open, postMessage origin/state verification, INFR-07 regression
affects:
  - 01-03
  - all authenticated feature plans

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Octokit factory: createGraphqlClient uses graphql.defaults() for header injection; createRestClient wraps Octokit with auth"
    - "verifyMaintainerStatus: null-guard first, REST GET /user then GET /repos/.../collaborators/:username, catch-all returns false"
    - "Router guard imports verifyMaintainerStatus from lib/github/auth — not co-located stub — so guard is testable via vi.mock"
    - "Auth spec uses vi.mock at top-level + vi.mocked(createRestClient).mockReturnValue() per test for dynamic mock behavior"
    - "Router spec uses vi.mock at module level + vi.clearAllMocks in beforeEach; navigates to /browse then /admin to reset state"
    - "useAuthStore spec: vi.stubEnv VITE_CF_WORKER_URL in beforeEach; captures state from window.open URL via regex"

key-files:
  created:
    - src/lib/github/octokit.ts
    - src/lib/github/auth.ts
    - src/lib/github/octokit.spec.ts
    - src/lib/github/auth.spec.ts
  modified:
    - src/router/index.ts
    - src/router/index.spec.ts
    - src/workers/oauth.spec.ts
    - src/stores/useAuthStore.spec.ts

key-decisions:
  - "Router re-exports verifyMaintainerStatus from lib/github/auth (not a local stub) — enables vi.mock in router tests to assert INFR-08"
  - "verifyMaintainerStatus fetches GET /user first to get username, then checks collaborator status — GitHub API requires username not token for collaborator check"
  - "OAuth Worker tests mock global fetch via vi.spyOn(global, 'fetch') — avoids real HTTP in unit tests while testing actual worker handler"
  - "useAuthStore state captured via regex on window.open URL argument — allows Test 7/9/11 to dispatch matching postMessage events"

patterns-established:
  - "Pattern: Top-level vi.mock with factory + vi.mocked().mockReturnValue() per test for granular control without module re-import"
  - "Pattern: vi.stubEnv / vi.unstubAllEnvs in beforeEach/afterEach for VITE_ env var injection in tests"
  - "Pattern: Router guard calls imported library function (not co-located stub) — mockable independently of router module"

requirements-completed:
  - USER-01
  - USER-02
  - INFR-04
  - INFR-07
  - INFR-08

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 1 Plan 02: GitHub OAuth Worker, Octokit Factory, and Router Guard Summary

**GitHub OAuth popup flow proven end-to-end via tests: Octokit factory functions, verifyMaintainerStatus via GitHub REST collaborator API, and router /admin guard calling real API (not Pinia state) — all INFR-07/08 security requirements verified by automated tests**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-14T22:34:49Z
- **Completed:** 2026-03-14T22:37:57Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- `src/lib/github/octokit.ts`: createGraphqlClient() and createRestClient() factory functions wrapping @octokit/graphql and @octokit/core
- `src/lib/github/auth.ts`: verifyMaintainerStatus() calling GET /user then GET /repos/.../collaborators/:username — returns true only on 204
- Router /admin guard updated to import verifyMaintainerStatus from lib/github/auth — test proves it calls the GitHub API (INFR-08) not just reads isMaintainer boolean
- 10 OAuth Worker tests covering /login redirect, /callback exchange, state echo, CLIENT_SECRET not in response body
- 11 useAuthStore tests covering popup open, postMessage origin/state verification, INFR-07 regression on full login flow

## Task Commits

1. **TDD RED: Test stubs for octokit, auth, and router guard** - `6d50ac5` (test)
2. **Task 1: Octokit factory, verifyMaintainerStatus, router guard wired to GitHub API** - `f84e6c8` (feat)
3. **Task 2: OAuth Worker tests and useAuthStore login flow tests** - `3461e6b` (feat)

## Files Created/Modified

- `src/lib/github/octokit.ts` — createGraphqlClient(token?) and createRestClient(token) factory functions
- `src/lib/github/auth.ts` — verifyMaintainerStatus(token|null): boolean via GitHub REST collaborator check
- `src/lib/github/octokit.spec.ts` — 3 tests for factory function shape and auth header injection
- `src/lib/github/auth.spec.ts` — 5 tests: null token, undefined token, 204 response, 404 response, error catch
- `src/router/index.ts` — Updated to import verifyMaintainerStatus from @/lib/github/auth (not local stub)
- `src/router/index.spec.ts` — 4 real tests replacing todo stubs: auth redirect, INFR-08 API call proof, false/true maintainer cases
- `src/workers/oauth.spec.ts` — 10 tests replacing todo stubs: /login, /callback, state echo, security
- `src/stores/useAuthStore.spec.ts` — 11 total tests (5 existing + 6 new): full login popup + postMessage flow

## Decisions Made

- **Router re-exports verifyMaintainerStatus from lib/github/auth:** The router imports from `@/lib/github/auth` (not a local stub). Test spec mocks that path via `vi.mock('@/lib/github/auth')` — this is the only way to assert the router calls the GitHub API function rather than reading Pinia state (satisfies INFR-08).
- **verifyMaintainerStatus fetches /user before collaborator check:** GitHub REST API's collaborator endpoint requires a username, not a token. Fetching GET /user first retrieves the authenticated user's login, which is then used for the collaborator lookup.
- **OAuth Worker was fully implemented in Plan 01-01:** oauth.ts was already complete with the full /login + /callback flow. Plan 02 work was adding comprehensive test coverage.
- **useAuthStore login() was already implemented in Plan 01-01:** The closure-state pattern and postMessage listener were already in place. Plan 02 added Tests 6-11 to formally verify the behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced vi.doMock dynamic mocking with top-level vi.mock in auth.spec.ts**
- **Found during:** Task 1 (GREEN phase test run)
- **Issue:** `vi.doMock('./octokit')` + dynamic `import('./auth')` didn't intercept the already-cached module, causing the 204 test to return false
- **Fix:** Changed to `vi.mock('./octokit', factory)` at module top-level with `vi.mocked(createRestClient).mockReturnValue()` per test
- **Files modified:** src/lib/github/auth.spec.ts
- **Verification:** All 5 auth tests pass including 204/404 cases
- **Committed in:** f84e6c8 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed router test state leaking between tests (mock returning stale true)**
- **Found during:** Task 1 (GREEN phase test run)
- **Issue:** Third router test ("redirects to /browse when false") was receiving stale mock state from prior test (mockVerify still returning true from second test because router module was cached)
- **Fix:** Added `await router.push('/browse')` before `await router.push('/admin')` in the third test to ensure the guard re-runs against fresh mock; vi.clearAllMocks in beforeEach ensures mock return value is reset
- **Files modified:** src/router/index.spec.ts
- **Verification:** All 4 router guard tests pass in correct order
- **Committed in:** f84e6c8 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs in test code)
**Impact on plan:** Both fixes required for test correctness. No scope creep — no new functionality added.

## Issues Encountered

- Vitest module caching makes `vi.doMock` + dynamic imports unreliable for intercepting already-loaded modules. Solution is to always declare mocks at module top-level with `vi.mock()` factories and configure per-test behavior via `vi.mocked()`.

## User Setup Required

None — no new external service configuration required beyond what Plan 01-01 documented (Cloudflare Worker secrets and Pages deployment).

## Next Phase Readiness

- OAuth layer is fully tested and ready for integration with Plan 03 (App Shell UI)
- useAuthStore.login() opens popup; receiveToken() stores token in memory only
- verifyMaintainerStatus is the real GitHub API check — Plan 03 can call it for route guarding
- fetchCurrentUser() remains a stub (Phase 2 fills in GraphQL query for user profile data)
- No blockers for Plan 03

---
*Phase: 01-foundation*
*Completed: 2026-03-14*
