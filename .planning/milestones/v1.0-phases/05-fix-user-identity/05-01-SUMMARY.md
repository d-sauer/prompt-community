---
phase: 05-fix-user-identity
plan: "01"
subsystem: auth
tags: [graphql, pinia, vue-router, vitest, tdd, github-api, octokit]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: useAuthStore token/user/isMaintainer refs, verifyMaintainerStatus, createGraphqlClient
  - phase: 03-community-and-profiles
    provides: ProfileRedirectView stub, user-profile route
provides:
  - GET_VIEWER GraphQL query constant in queries.ts
  - Live fetchCurrentUser implementation populating authStore.user with 9 GitHubUser fields
  - isMaintainer set eagerly via verifyMaintainerStatus after successful fetchCurrentUser
  - Reactive ProfileRedirectView with watch-based async redirect and unauthenticated message
  - 5-second timeout fallback to /browse with onUnmounted cleanup
  - Navbar Profile DropdownMenuItem wired to router.push('/profile')
affects: [06-command-palette, 07-shell, USER-04, SHEL-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GraphQL viewer query: followers/following/repositories use connection totalCount fields (not scalar fields)"
    - "ProfileRedirectView uses watch() + setTimeout for async redirect pattern (not synchronous router.replace in setup)"
    - "Navbar dropdown click tests use DropdownMenuItem stubs (div with @click) to bypass reka-ui MenuRoot context requirement"
    - "useDark stub in Navbar tests to avoid @vueuse/core localStorage issues in jsdom"

key-files:
  created:
    - src/views/ProfileRedirectView.spec.ts
    - src/components/layout/Navbar.spec.ts
  modified:
    - src/lib/github/queries.ts
    - src/stores/useAuthStore.ts
    - src/views/ProfileRedirectView.vue
    - src/components/layout/Navbar.vue
    - src/stores/useAuthStore.spec.ts

key-decisions:
  - "GET_VIEWER uses followers { totalCount }, following { totalCount }, repositories(privacy: PUBLIC) { totalCount } — scalar fields on viewer are wrong GraphQL shape"
  - "ProfileRedirectView watch() pattern instead of synchronous router.replace() — async fetch must resolve before redirect fires"
  - "Navbar spec stubs DropdownMenuItem as plain div — reka-ui MenuItem requires MenuRoot injection context not present in isolated mount"
  - "useDark mocked in Navbar.spec.ts — @vueuse/core useStorage fails in jsdom with --localstorage-file warning path"

patterns-established:
  - "TDD RED-GREEN: write failing specs first, then implement to pass"
  - "Stub reka-ui-based shadcn-vue components in isolation tests to avoid missing context injection errors"

requirements-completed: [USER-04, SHEL-01]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 5 Plan 01: Fix User Identity Summary

**Live GET_VIEWER GraphQL query replacing stub fetchCurrentUser, reactive ProfileRedirectView with watch-based async redirect, and Navbar Profile click navigation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T10:33:09Z
- **Completed:** 2026-03-26T10:37:00Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 7

## Accomplishments

- Replaced fetchCurrentUser stub with live GitHub GraphQL implementation that populates all 9 GitHubUser fields and calls verifyMaintainerStatus eagerly
- Rewrote ProfileRedirectView from synchronous broken redirect to watch-based async pattern with unauthenticated message and 5s timeout fallback
- Wired Navbar Profile DropdownMenuItem @click handler to router.push('/profile')
- Added 8 new passing tests covering all behaviors (20 total tests, 0 failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing specs (RED)** - `13dd260` (test)
2. **Task 2: Implement fixes (GREEN)** - `dfa1fdb` (feat)

_Note: TDD tasks have two commits (test RED → feat GREEN)_

## Files Created/Modified

- `src/lib/github/queries.ts` - Added GET_VIEWER GraphQL query constant with correct connection totalCount fields
- `src/stores/useAuthStore.ts` - Replaced stub fetchCurrentUser with live GraphQL implementation + verifyMaintainerStatus call
- `src/views/ProfileRedirectView.vue` - Rewritten with watch-based async redirect, unauthenticated message, 5s timeout
- `src/components/layout/Navbar.vue` - Added @click="router.push('/profile')" to Profile DropdownMenuItem
- `src/stores/useAuthStore.spec.ts` - Added describe('fetchCurrentUser') block (Tests A, B, C)
- `src/views/ProfileRedirectView.spec.ts` - New spec file (Tests D, E, F, G)
- `src/components/layout/Navbar.spec.ts` - New spec file (Tests H, I) with reka-ui stubs

## Decisions Made

- GET_VIEWER uses `followers { totalCount }`, `following { totalCount }`, `repositories(privacy: PUBLIC) { totalCount }` — scalar fields like `viewer.followers` are not valid in GitHub GraphQL API
- ProfileRedirectView uses `watch()` + `setTimeout` pattern instead of synchronous `router.replace()` call in script setup — the synchronous call fired before fetchCurrentUser resolved, always routing to /browse
- Navbar spec stubs DropdownMenuItem as a plain `<div>` component to avoid reka-ui `Symbol(MenuRootContext)` injection error when mounting in isolation
- `useDark` from `@vueuse/core` is mocked in Navbar spec because `useStorage` fails in jsdom without a valid localStorage-file path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated Navbar.spec.ts to stub DropdownMenuItem**

- **Found during:** Task 2 (GREEN implementation)
- **Issue:** Navbar.spec.ts written in Task 1 used `findAllComponents({ name: 'DropdownMenuItem' })` to find menu items, but with `DropdownMenuContent` stubbed, the underlying `DropdownMenuItem` still rendered reka-ui's `MenuItem` component which requires `MenuRootContext` injection — causing a test error
- **Fix:** Added `DropdownMenuItem` stub as plain div and changed item lookup to `wrapper.findAll('div').find(div => div.text().trim() === 'Profile')`; also added `useDark` mock to prevent `@vueuse/core` localStorage error
- **Files modified:** `src/components/layout/Navbar.spec.ts`
- **Verification:** Both Navbar tests pass; full suite green
- **Committed in:** `dfa1fdb` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test setup)
**Impact on plan:** Necessary fix for test infrastructure correctness. No scope creep.

## Issues Encountered

- reka-ui's `DropdownMenuItem` requires `MenuRootContext` injection that isn't available in isolation mount — resolved by stubbing the shadcn-vue DropdownMenuItem component in tests
- `@vueuse/core`'s `useDark`/`useStorage` fails in jsdom with `--localstorage-file` path — resolved by mocking `useDark` to return a simple ref

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `authStore.user` is now non-null after OAuth login — unblocks USER-04 (own profile view at /users/:login)
- `authStore.isMaintainer` is set eagerly after login — unblocks SHEL-01 (command palette auth-dependent behavior)
- Phase 6 (command palette) and Phase 7 (shell improvements) can now rely on correct auth store state

## Self-Check: PASSED

All created files exist on disk. Both task commits (13dd260, dfa1fdb) verified in git log.

---
*Phase: 05-fix-user-identity*
*Completed: 2026-03-26*
