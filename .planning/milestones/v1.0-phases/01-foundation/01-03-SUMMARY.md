---
phase: 01-foundation
plan: "03"
subsystem: ui
tags: [vue3, tailwind, shadcn-vue, pinia, vueuse, vitest, keyboard-shortcuts, responsive]

# Dependency graph
requires:
  - phase: 01-foundation-01-01
    provides: Pinia stores (useAuthStore, useUIStore, usePromptsStore), Vue Router, Vitest setup, shadcn-vue components
  - phase: 01-foundation-01-02
    provides: GitHub OAuth flow, useAuthStore.login/logout, verifyMaintainerStatus, router guard

provides:
  - AppLayout.vue — composition surface wiring Navbar + Sidebar + NotificationDrawer + RouterView
  - Navbar.vue — 48px sticky navbar with logo, CommandDialog, notification bell, theme toggle, avatar/sign-in, +New button
  - Sidebar.vue — collapsible 200px/48px aside with BROWSE/CATEGORIES/AI MODELS/SORT/ADMIN sections and mobile Sheet overlay
  - NotificationDrawer.vue — right-side Sheet stub with empty state
  - useKeyboardShortcuts composable — CMD+K, [, G+B, G+N chord shortcuts wired to UIStore/router
  - Full S01 wireframe acceptance criteria (AC-01 through AC-18) met

affects: [02-browse, 02-editor, 03-search, all future phases needing app shell]

# Tech tracking
tech-stack:
  added:
    - "@pinia/testing@1.0.3 — Pinia test isolation for component specs"
    - "@vueuse/core useDark() — theme toggle with automatic localStorage persistence"
    - "@vueuse/core useEventListener() — keyboard shortcut listener lifecycle management"
  patterns:
    - "Layout composition: AppLayout calls useKeyboardShortcuts() in setup, then renders Navbar + Sidebar + RouterView + NotificationDrawer"
    - "Store-driven UI: all interactive state (sidebar, notification drawer, command palette) lives in useUIStore"
    - "v-show on sidebar labels (not v-if) — preserves DOM for smooth CSS width animation"
    - "Mobile sidebar as Sheet overlay triggered by Navbar hamburger; desktop aside hidden on mobile via hidden lg:flex"
    - "Chord detection: chordFirstKey state + 500ms setTimeout in useKeyboardShortcuts; suppressed when input focused"
    - "Notification badge: v-if (not v-show) — badge not in DOM when count = 0"

key-files:
  created:
    - src/composables/useKeyboardShortcuts.ts
    - src/composables/useKeyboardShortcuts.spec.ts
    - src/components/layout/AppLayout.vue
    - src/components/layout/Navbar.vue
    - src/components/layout/Sidebar.vue
    - src/components/layout/NotificationDrawer.vue
    - src/components/layout/NotificationDrawer.spec.ts
  modified:
    - src/stores/useUIStore.ts
    - src/router/index.ts
    - src/stores/useAuthStore.spec.ts
    - src/workers/oauth.spec.ts

key-decisions:
  - "v-show (not v-if) on sidebar labels — DOM preservation required for smooth 0.3s CSS width transition animation"
  - "Mobile sidebar implemented as Sheet overlay (not responsive collapse of inline aside) — matches SHEL-06 requirement"
  - "Notification badge uses v-if not v-show — badge must not exist in DOM when count = 0 (per CONTEXT.md)"
  - "useDark() from VueUse handles theme toggle and localStorage persistence — no custom implementation needed"
  - "sidebarMobileOpen added to useUIStore as deviation auto-fix — required for Navbar hamburger → Sidebar Sheet wiring"
  - "Router nested all routes under AppLayout as layout component — enables shell on every page without per-route imports"

patterns-established:
  - "Layout component pattern: AppLayout as router parent renders shell once; child routes render in RouterView slot"
  - "Composable keyboard shortcuts: useKeyboardShortcuts() called once in AppLayout setup, manages global keydown listener via useEventListener"
  - "Store-wired components: Navbar and Sidebar import multiple stores and use computed refs for reactive UI state"
  - "TDD with @pinia/testing: createTestingPinia({ initialState }) for component isolation without real store side effects"

requirements-completed: [SHEL-01, SHEL-02, SHEL-03, SHEL-04, SHEL-05, SHEL-06]

# Metrics
duration: ~20min (plus human checkpoint)
completed: 2026-03-15
---

# Phase 1 Plan 03: App Shell Summary

**Full S01 app shell: sticky Navbar with CMD+K CommandDialog, collapsible 200px/48px Sidebar with filter sections, NotificationDrawer Sheet stub, and useKeyboardShortcuts composable (⌘K, [, G+B, G+N) — all 18 AC criteria verified**

## Performance

- **Duration:** ~20 min execution + human checkpoint verification
- **Started:** 2026-03-14T23:42:18+01:00
- **Completed:** 2026-03-15 (human checkpoint approved)
- **Tasks:** 3 (2 auto, 1 human-verify checkpoint — approved)
- **Files modified:** 13

## Accomplishments

- useKeyboardShortcuts composable with ⌘K (command palette), [ (sidebar toggle), G+B (/browse), G+N (/prompts/new) chord detection — all 7 tests pass
- Complete AppLayout + Navbar + Sidebar + NotificationDrawer component tree wired to Pinia stores
- All 50 Vitest suite tests green; production build succeeds with zero TypeScript errors
- Human visual checkpoint approved — all 11 interactive verification items confirmed (navbar sticky, theme toggle persists, ⌘K opens/closes, G+B/G+N navigate, sidebar animates, OAuth popup, notification drawer empty state, mobile hamburger/Sheet, admin hidden, version badge, active route highlight)

## Task Commits

Each task was committed atomically:

1. **Task 1: useKeyboardShortcuts composable and tests** - `6da3a34` (feat)
2. **Task 2: AppLayout, Navbar, Sidebar, NotificationDrawer and test** - `c4ea373` (feat)
3. **Task 3: Visual and interactive verification** - Human checkpoint approved (no code commit — verification only)

## Component Tree

```
AppLayout.vue
  ├── useKeyboardShortcuts()   ← called in setup()
  ├── <Navbar />               ← reads useAuthStore, useUIStore; CommandDialog, bell, avatar, +New
  ├── <Sidebar class="hidden lg:flex" />  ← reads useUIStore, useAuthStore, usePromptsStore
  │     └── <Sheet v-model:open="uiStore.sidebarMobileOpen">  ← mobile overlay
  ├── <main><RouterView /></main>
  └── <NotificationDrawer />   ← reads useUIStore.notificationDrawerOpen / notificationCount
```

## Keyboard Shortcut Map

| Key Combination | Handler | Action |
|----------------|---------|--------|
| ⌘K / Ctrl+K | useKeyboardShortcuts | `uiStore.openCommandPalette()` + `e.preventDefault()` |
| `[` | useKeyboardShortcuts | `uiStore.toggleSidebar()` |
| G → B (within 500ms) | useKeyboardShortcuts | `router.push('/browse')` |
| G → N (within 500ms) | useKeyboardShortcuts | `router.push('/prompts/new')` |
| Any key when input focused | useKeyboardShortcuts | Suppressed (early return) |

## Store ↔ Component Wiring

| Store | Component | What's read/written |
|-------|-----------|-------------------|
| useUIStore | Navbar | `commandPaletteOpen` (v-model), `notificationDrawerOpen` (toggle), `notificationCount` (badge), `sidebarMobileOpen` (hamburger) |
| useUIStore | Sidebar | `sidebarCollapsed` (width class + v-show on labels), `sidebarMobileOpen` (Sheet v-model) |
| useUIStore | NotificationDrawer | `notificationDrawerOpen` (Sheet v-model), `notificationCount` (empty state/badge) |
| useUIStore | useKeyboardShortcuts | `openCommandPalette()`, `toggleSidebar()` |
| useAuthStore | Navbar | `isAuthenticated` (v-if avatar vs sign-in), `user.login` (avatar initials), `login()`, `logout()` |
| useAuthStore | Sidebar | `isMaintainer` (v-if ADMIN section) |
| usePromptsStore | Sidebar | `setCategory()`, `setModel()`, `setSortOrder()`, `filterState`, `sortOrder` (active item highlighting) |

## Responsive Breakpoint Implementation

| Breakpoint | Sidebar | Navbar |
|-----------|---------|--------|
| < 640px (mobile) | Hidden — Sheet overlay via `sidebarMobileOpen` | Hamburger button visible (`lg:hidden`) |
| ≥ 1024px (desktop) | Inline `<aside class="hidden lg:flex">` | Full search bar; hamburger hidden |
| Collapsed mode | 48px (w-12) icon-only; labels `v-show="!uiStore.sidebarCollapsed"` | N/A |
| Expanded mode | 200px (w-[200px]) with labels | N/A |

## Files Created/Modified

- `src/composables/useKeyboardShortcuts.ts` — Global keydown composable with ⌘K, [, chord G+B/G+N
- `src/composables/useKeyboardShortcuts.spec.ts` — 7 tests covering all shortcut behaviors and edge cases
- `src/components/layout/AppLayout.vue` — Layout shell: calls useKeyboardShortcuts, mounts all layout components
- `src/components/layout/Navbar.vue` — 48px sticky navbar with all AC-01 through AC-07 elements
- `src/components/layout/Sidebar.vue` — Collapsible aside with 5 sections + mobile Sheet overlay
- `src/components/layout/NotificationDrawer.vue` — Right Sheet stub with empty state
- `src/components/layout/NotificationDrawer.spec.ts` — 3 tests: badge hidden at 0, empty state visible, badge at 3
- `src/stores/useUIStore.ts` — Added `sidebarMobileOpen: ref(false)` for mobile hamburger
- `src/router/index.ts` — Nested all routes under AppLayout as layout component
- `src/stores/useAuthStore.spec.ts` — Auto-fixed: removed unused variables
- `src/workers/oauth.spec.ts` — Auto-fixed: `global` → `globalThis` for ESM compatibility

## Decisions Made

- **v-show on sidebar labels** (not v-if): DOM must remain for smooth 0.3s CSS width animation; removing elements with v-if causes jank during collapse/expand transition
- **Mobile sidebar as Sheet overlay**: AppLayout's `<aside>` is `hidden lg:flex` — on mobile the Sheet provides the sidebar independently, rather than the inline aside becoming responsive
- **Notification badge uses v-if not v-show**: Per CONTEXT.md decision — badge must not exist in DOM when count = 0, not merely hidden
- **useDark() from VueUse**: Handles class toggling on `<html>` element and localStorage persistence automatically — no custom implementation
- **Router nesting under AppLayout**: All routes nested as children of AppLayout route entry — shell renders once without per-route imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added sidebarMobileOpen to useUIStore**
- **Found during:** Task 2 (Sidebar/Navbar implementation)
- **Issue:** Plan referenced `uiStore.sidebarMobileOpen` in Navbar hamburger and Sidebar Sheet, but it was not defined in useUIStore from Plan 01-01
- **Fix:** Added `sidebarMobileOpen: ref(false)` to useUIStore state and `toggleSidebarMobile()` action
- **Files modified:** src/stores/useUIStore.ts
- **Verification:** Navbar hamburger successfully triggers Sidebar Sheet overlay; test suite green
- **Committed in:** c4ea373 (Task 2 commit)

**2. [Rule 3 - Blocking] Installed @pinia/testing for component test isolation**
- **Found during:** Task 1 (NotificationDrawer spec)
- **Issue:** Component tests mounting with Pinia required createTestingPinia for proper store isolation; bare Pinia plugin caused test interference
- **Fix:** Installed @pinia/testing@1.0.3
- **Files modified:** package.json, package-lock.json
- **Verification:** All 3 NotificationDrawer tests pass in isolation
- **Committed in:** 6da3a34 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed global → globalThis in oauth.spec.ts**
- **Found during:** Task 2 (full suite run before commit)
- **Issue:** oauth.spec.ts used `global.` prefix which is not valid in ESM test environment; caused test failures
- **Fix:** Replaced `global.` with `globalThis.` in test mocks
- **Files modified:** src/workers/oauth.spec.ts
- **Verification:** Full 50-test suite green
- **Committed in:** c4ea373 (Task 2 commit)

**4. [Rule 1 - Bug] Removed unused variables in authStore.spec.ts**
- **Found during:** Task 2 (TypeScript build check)
- **Issue:** Unused variable declarations caused TypeScript `noUnusedLocals` errors that failed build
- **Fix:** Removed unused variable declarations
- **Files modified:** src/stores/useAuthStore.spec.ts
- **Verification:** `npm run build` succeeds with zero errors
- **Committed in:** c4ea373 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (1 missing critical, 1 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correctness, test isolation, and build success. No scope creep.

## Issues Encountered

- Router configuration required nesting all existing routes as children of AppLayout — plan implied this but did not explicitly specify the router restructuring. Handled as part of Task 2 without deviation classification (implementation detail).

## Human Checkpoint Result

**Task 3: Visual and interactive verification — APPROVED**

All 11 verification items confirmed by user:
1. Navbar 48px sticky, dark background, logo navigates to /browse
2. Theme toggle switches dark/light and persists on refresh
3. ⌘K opens command palette overlay; Escape closes it
4. G+B navigates to /browse; G+N to /prompts/new; suppressed in inputs
5. Sidebar animates 200px → 48px in ~0.3s; labels hide; icons remain; tooltips appear
6. Sign in with GitHub opens OAuth popup
7. Notification bell opens right drawer; "No notifications yet" empty state; no badge (count 0)
8. Mobile < 640px: sidebar hidden; hamburger appears; tap opens Sheet overlay
9. Admin section not visible when not authenticated
10. Version badge visible at sidebar bottom
11. /browse route highlights "All Prompts" with purple left border and background

## Next Phase Readiness

- App shell complete — Phase 2 browse/editor views have a frame to render inside via RouterView
- CommandDialog stub ready for MiniSearch integration in Phase 2 (search index wiring)
- Sidebar category/model/sort filters write to usePromptsStore — Phase 2 browse view reads these
- ADMIN section stub wired to `authStore.isMaintainer` — Phase 3 moderation features can activate it
- No blockers for Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-03-15*
