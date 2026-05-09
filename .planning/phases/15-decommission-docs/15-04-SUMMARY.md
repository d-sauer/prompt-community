---
phase: 15-decommission-docs
plan: "04"
subsystem: auth, ui
tags: [vue3, pinia, jwt, localStorage, shadcn-vue, hono, cloudflare-workers]

# Dependency graph
requires:
  - phase: 15-decommission-docs
    provides: "dev.vars + wrangler.toml env config for API worker"
  - phase: 10-auth-migration
    provides: "POST /auth/dev-login endpoint (ENV-gated), useAuthStore with fetchMe()"
provides:
  - "DevLoginModal.vue — dev-only modal for selecting or adding arbitrary dev login users"
  - "Navbar login button rebranded from 'Sign in with GitHub' to 'Sign in' (DECOM-14)"
  - "POST /auth/dev-login extended to accept arbitrary { login, role, name } not just fixture IDs (DECOM-15)"
affects: ["15-decommission-docs", "future-auth-work"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "import.meta.env.DEV branching in script function (not inline template) for safe test-env compilation"
    - "Deterministic DEVUSR-prefixed ID for arbitrary dev login strings — stable identity across sessions"
    - "localStorage pc-dev-users key persists added dev users; DEFAULT_USERS always prepended at load time"

key-files:
  created:
    - src/components/layout/DevLoginModal.vue
  modified:
    - src/components/layout/Navbar.vue
    - src/workers/api/routes/auth.ts

key-decisions:
  - "import.meta.env.DEV check placed in handleSignIn() function, not inline @click expression — inline import.meta causes Vue template compiler error in jsdom test environment"
  - "Deterministic sub ID pattern: 'DEVUSR' + login.toUpperCase().replace(/[^A-Z0-9]/g,'0').slice(0,20).padEnd(20,'0') — 26-char ULID-shaped, stable across repeated calls"
  - "DevLoginModal placed inside the right-section div, after Sign in Button — minimal Navbar template surgery"

patterns-established:
  - "Script-function wrapping for import.meta.env.DEV conditional in Vue SFCs: keeps template clean, avoids jsdom compile errors"

requirements-completed:
  - DECOM-14
  - DECOM-15

# Metrics
duration: 3min
completed: 2026-05-09
---

# Phase 15 Plan 04: Login Button Branding + Dev User Selector Modal Summary

**Navbar login button rebranded to 'Sign in' with a dev-mode modal that lets developers authenticate as any arbitrary login string — persisted in localStorage, no GitHub OAuth round-trip needed**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-09T20:05:27Z
- **Completed:** 2026-05-09T20:09:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `POST /auth/dev-login` to accept `{ login?, role?, name? }` — arbitrary logins generate a deterministic DEVUSR-prefixed sub ID; hardcoded fixture IDs preserved for dev-user and dev-maintainer
- Created `DevLoginModal.vue` — shadcn Dialog listing seeded dev users with role badges; add-user form with login input + role Select; localStorage persistence under `pc-dev-users`; inline error display; calls `authStore.fetchMe()` on success
- Updated `Navbar.vue` — button text changed from "Sign in with GitHub" to "Sign in"; `handleSignIn()` branches on `import.meta.env.DEV` to open modal (dev) or call `authStore.login()` (prod)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend POST /auth/dev-login to accept arbitrary login/name** - `2121b78` (feat)
2. **Task 2: Create DevLoginModal.vue and update Navbar.vue** - `3bc3820` (feat)

## Files Created/Modified

- `src/workers/api/routes/auth.ts` — Extended `/dev-login` handler with login/name params + deterministic ID generation
- `src/components/layout/DevLoginModal.vue` — New dev-only modal component (172 lines)
- `src/components/layout/Navbar.vue` — Button text + handleSignIn() branch + DevLoginModal wired in

## Decisions Made

- `import.meta.env.DEV` must live in a script function, not inline in `@click` — Vue's template compiler in jsdom mode does not support `import.meta` in attribute expressions, causing a parse error that breaks all Navbar tests
- Deterministic sub ID `'DEVUSR' + login.toUpperCase().replace(/[^A-Z0-9]/g,'0').slice(0,20).padEnd(20,'0')` chosen for stable identity without a database lookup — matches the ULID 26-char format convention

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved import.meta.env.DEV from inline template to script function**
- **Found during:** Task 2 (Create DevLoginModal.vue and update Navbar.vue)
- **Issue:** Inline `@click="import.meta.env.DEV ? ... : ..."` in Vue template caused a compile error in the jsdom test environment: "Error parsing JavaScript expression: import.meta may appear only with 'sourceType: module'". This broke all 4 existing Navbar tests.
- **Fix:** Extracted to `handleSignIn()` function in `<script setup>` where `import.meta` is valid; template uses `@click="handleSignIn"` instead
- **Files modified:** src/components/layout/Navbar.vue
- **Verification:** All 158 frontend tests pass; `grep "import.meta.env.DEV" Navbar.vue` still returns 1 match (in script)
- **Committed in:** 3bc3820 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary for test compatibility. The plan's acceptance criteria for `import.meta.env.DEV` grep match is satisfied (script section). Functional behavior is identical.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DECOM-14 and DECOM-15 complete
- Phase 15 decommission work is done; production deployment checkpoint (15-02) remains pending
- `DevLoginModal` and `handleSignIn` pattern ready for future dev-workflow improvements

---
*Phase: 15-decommission-docs*
*Completed: 2026-05-09*
