---
phase: 06-fix-command-palette-admin-sidebar
plan: 01
subsystem: ui
tags: [vue, pinia, vitest, command-palette, router, search, minisearch]

# Dependency graph
requires:
  - phase: 05-fix-user-identity
    provides: Navbar tests with DropdownMenuItem stub pattern and useUIStore wiring
  - phase: 04-admin-and-pwa
    provides: Admin router guard with verifyMaintainerStatus, useAuthStore.isMaintainer ref
  - phase: 02-read-and-contribute
    provides: useSearchStore with MiniSearch, setQuery(), results computed
provides:
  - Navbar.vue with wired CommandInput @input -> searchStore.setQuery, CommandItem list from searchResults.slice(0,8), close-reset watch
  - router/index.ts with authStore.isMaintainer write-back before redirect in admin guard
  - 6 new unit tests proving SHEL-01 and ADMN-01 behaviors
affects: [07-etag-caching, future-search-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CommandInput stub with inheritAttrs:false + v-bind="$attrs" to forward listeners to underlying input in tests
    - TDD red-green cycle: failing tests committed before implementation

key-files:
  created: []
  modified:
    - src/components/layout/Navbar.vue
    - src/router/index.ts
    - src/components/layout/Navbar.spec.ts
    - src/router/index.spec.ts

key-decisions:
  - "CommandInput stub uses inheritAttrs:false + v-bind='$attrs' to forward @input listener from Navbar to test input element — direct trigger('input') cannot set e.target.value, setValue() works when attrs are forwarded"
  - "authStore.isMaintainer write-back applies for both true and false outcomes — sidebar reactivity requires both paths to write the ref"

patterns-established:
  - "Pattern: When testing Vue components with stub child components that use inheritAttrs:false, the stub must explicitly spread $attrs to forward event listeners"

requirements-completed: [SHEL-01, ADMN-01]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 06 Plan 01: Fix Command Palette and Admin Sidebar Summary

**Command palette wired to useSearchStore (setQuery + results list + close-reset) and admin router guard now writes authStore.isMaintainer before redirect check**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T15:27:46Z
- **Completed:** 2026-03-26T15:31:39Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Command palette search now functional: typing calls searchStore.setQuery, results render as CommandItem list (max 8) with category color dots, selecting navigates to /prompts/:id, closing resets query
- Admin sidebar v-if="isMaintainer" now becomes reactive on first /admin visit: one-line fix writes authStore.isMaintainer = confirmed in router guard before redirect check
- 6 new unit tests written TDD-style (RED commit then GREEN commit) covering SHEL-01 (4 tests) and ADMN-01 (2 tests), all passing with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing tests for SHEL-01 and ADMN-01** - `4cb5902` (test)
2. **Task 2: Wire CommandInput to useSearchStore in Navbar.vue and add isMaintainer write-back in router/index.ts** - `6b4c104` (feat)

## Files Created/Modified
- `src/components/layout/Navbar.vue` - Added useSearchStore import, CommandItem import, watch for palette close reset, onCommandInput handler, onSelectResult handler, CATEGORY_COLORS map, updated CommandDialog template block
- `src/router/index.ts` - Added single line `authStore.isMaintainer = confirmed` before redirect check in admin guard
- `src/components/layout/Navbar.spec.ts` - Added paletteConfig helper with expanded stubs, 4 new tests (A-D) for SHEL-01, fixed CommandInput stub to spread $attrs
- `src/router/index.spec.ts` - Added 2 new tests (E-F) for ADMN-01 isMaintainer write-back

## Decisions Made
- CommandInput stub in tests uses `inheritAttrs: false` + `v-bind="$attrs"` — vue-test-utils `trigger('input', { target: { value } })` cannot set e.target.value; `setValue()` works when the `@input` listener from Navbar is forwarded via $attrs to the stub's underlying `<input>`
- Both true and false outcomes write `authStore.isMaintainer` — the sidebar's `v-if="isMaintainer"` needs the store ref to be updated for both paths to ensure reactivity works correctly whether granting or revoking access

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CommandInput stub test technique adjusted from trigger to setValue**
- **Found during:** Task 2 (making tests GREEN)
- **Issue:** Plan's Test A used `trigger('input', { target: { value: 'python' } })` but vue-test-utils throws "you cannot set the target value of an event"
- **Fix:** Used `setValue('python')` instead; also updated CommandInput stub to include `v-bind="$attrs"` so @input listener from Navbar reaches the inner input element
- **Files modified:** src/components/layout/Navbar.spec.ts
- **Verification:** Test A now passes, all 14 tests pass
- **Committed in:** 6b4c104 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — test technique incompatibility with vue-test-utils)
**Impact on plan:** Minor test implementation adjustment, no scope change. Stub pattern (inheritAttrs:false + v-bind=$attrs) is the documented correct approach for component stubs that need to forward event listeners.

## Issues Encountered
- vue-test-utils does not allow setting `event.target.value` directly in trigger() — this is a known limitation documented in their docs. Resolved by using setValue() which properly sets the input's value and fires the input event.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SHEL-01 and ADMN-01 requirements are complete — all v1.0 audit gaps before ETag caching are now closed
- Phase 7 (ETag caching) can proceed with full confidence in search and admin functionality
- No blockers or concerns

---
*Phase: 06-fix-command-palette-admin-sidebar*
*Completed: 2026-03-26*
