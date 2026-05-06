---
phase: 10-auth-migration
plan: "04"
subsystem: auth
tags: [pinia, vue, oauth, cookie-session, popup-auth, github-oauth]

# Dependency graph
requires:
  - phase: 10-auth-migration/10-03
    provides: "GET /me and POST /auth/dev-login endpoints; cookie session established by server"
provides:
  - "useAuthStore rewritten for cookie-based session: no token ref, poll-on-close popup pattern, fetchMe() with credentials:include"
  - "AuthCallbackView.vue: popup landing page that calls window.close() on mount"
  - "/auth/callback SPA route registered in router"
  - "CONTRIBUTING.md DEV-04 section: two GitHub OAuth Apps setup and env var switching"
affects:
  - 11-prompts-api
  - 12-frontend-data
  - 13-auth-hardening

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Poll-on-close popup pattern: setInterval(200ms) checks popup.closed, calls fetchMe() on close"
    - "Cookie-based auth: no token in JS, credentials:include on every /me call"
    - "isAuthenticated and isMaintainer are computed from user ref (not token)"

key-files:
  created:
    - src/views/AuthCallbackView.vue
  modified:
    - src/stores/useAuthStore.ts
    - src/router/index.ts
    - CONTRIBUTING.md

key-decisions:
  - "AuthCallbackView only calls window.close() — no fetch, no state, no side effects"
  - "logout() only clears user.value in JS — POST /auth/logout deferred to Phase 13 (cookie has 7-day hard expiry)"
  - "No window.addEventListener message listener — postMessage pattern fully removed"

patterns-established:
  - "Popup OAuth pattern: open popup to /auth/login, poll popup.closed, call fetchMe() on close"
  - "isMaintainer derived from user.role === 'maintainer' (computed, not stored)"

requirements-completed: [AUTH-10, DEV-04]

# Metrics
duration: 8min
completed: 2026-05-06
---

# Phase 10 Plan 04: Auth Store Cookie Migration Summary

**Cookie-based OAuth popup flow wired end-to-end: useAuthStore with poll-on-close pattern, AuthCallbackView.vue, and CONTRIBUTING DEV-04 documentation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-06T16:25:56Z
- **Completed:** 2026-05-06T16:33:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Rewrote useAuthStore to use HttpOnly cookie session — no token ref, no postMessage listener, no github imports
- Created AuthCallbackView.vue as the popup landing page (calls window.close() on mount)
- Added /auth/callback route to Vue Router
- Documented two-OAuth-App setup and env var switching in CONTRIBUTING.md (DEV-04)
- All 130 frontend tests + 27 worker tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite useAuthStore for cookie-based session (AUTH-10)** - `fb628b9` (feat)
2. **Task 2: Add /auth/callback SPA route + DEV-04 CONTRIBUTING update** - `617a167` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/stores/useAuthStore.ts` - Rewritten: ApiUser interface, poll-on-close login(), fetchMe() with credentials:include, isAuthenticated/isMaintainer as computed
- `src/views/AuthCallbackView.vue` - New: popup route component that calls window.close() on mount
- `src/router/index.ts` - Added /auth/callback route; removed verifyMaintainerStatus re-export
- `CONTRIBUTING.md` - Added GitHub OAuth Setup (DEV-04) section documenting two OAuth Apps and env var switching

## Decisions Made
- `AuthCallbackView.vue` only calls `window.close()` — no fetch, no state — keeps popup concern minimal
- `logout()` clears `user.value = null` only; POST /auth/logout deferred to Phase 13 (cookie has 7-day hard expiry by design)
- `verifyMaintainerStatus` re-export removed from router in same commit as router guard update — clean break from token-based pattern

## Deviations from Plan

None - plan executed exactly as written. Task 1 (useAuthStore + tests) and Task 2 (AuthCallbackView + router + CONTRIBUTING) were both already partially executed in a prior session; this run completed the uncommitted Task 2 files and verified full test suite green.

## Issues Encountered
None — the store rewrite and router update were committed in a prior partial run (`fb628b9`). This execution committed the two remaining unstaged/untracked files (AuthCallbackView.vue, CONTRIBUTING.md) and verified full test passage.

## User Setup Required
None - no external service configuration required for this plan. (CONTRIBUTING.md documents the GitHub OAuth App setup that developers must do manually before first use.)

## Next Phase Readiness
- Complete OAuth login flow is end-to-end wired: popup opens → GitHub OAuth → server sets cookie → popup redirects to /auth/callback → window.close() → parent polls closed → calls /me → store populated
- Phase 10 auth migration is complete
- Ready for Phase 11 (prompts API) or Phase 13 (auth hardening: logout endpoint, session revocation)

## Self-Check: PASSED

- FOUND: src/stores/useAuthStore.ts
- FOUND: src/views/AuthCallbackView.vue
- FOUND: src/router/index.ts
- FOUND: CONTRIBUTING.md
- FOUND: .planning/phases/10-auth-migration/10-04-SUMMARY.md
- FOUND commit: fb628b9 (Task 1)
- FOUND commit: 617a167 (Task 2)
- Tests: 130 frontend passed, 27 worker tests passed

---
*Phase: 10-auth-migration*
*Completed: 2026-05-06*
