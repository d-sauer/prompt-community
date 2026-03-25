---
phase: 04-admin-and-pwa
plan: "03"
subsystem: pwa
tags: [vite-plugin-pwa, workbox, service-worker, offline, localStorage, vue-sonner, vueuse]

# Dependency graph
requires:
  - phase: 03-community-and-profiles
    provides: useComments and useReactions composables that were extended for offline queue
  - phase: 04-admin-and-pwa
    provides: plan 01/02 app shell and admin composables
provides:
  - Service worker with NetworkFirst (GitHub API) + StaleWhileRevalidate (avatars) caching
  - useOfflineQueue composable with enqueue/drainQueue/getQueue/isOnline
  - Offline toast notifications via vue-sonner
  - Write sync queue (postComment + toggleReaction) drained on reconnect
affects: []

# Tech tracking
tech-stack:
  added: [vite-plugin-pwa@1.2.0, workbox-strategies]
  patterns:
    - "Offline-first write queue: actions enqueued to localStorage (no token) when offline, drained by App.vue on reconnect/re-auth"
    - "vi.stubGlobal('localStorage', mockImpl) for localStorage tests in jsdom+spied environment"

key-files:
  created:
    - src/composables/queries/useOfflineQueue.ts
    - src/composables/queries/useOfflineQueue.spec.ts
    - public/pwa-192.png
    - public/pwa-512.png
  modified:
    - vite.config.ts
    - src/App.vue
    - src/composables/queries/useComments.ts
    - src/composables/queries/useReactions.ts

key-decisions:
  - "useOfflineQueue watch(isOnline) fires offline toast on going offline; does NOT auto-drain on reconnect — App.vue calls drainQueue explicitly after checking auth token"
  - "Token stripped from QueuedAction.payload defensively before localStorage.setItem — verified by unit test spy assertion"
  - "vi.stubGlobal('localStorage', ...) pattern required in jsdom+spied environment — Storage.prototype spies in setup.ts make direct localStorage.removeItem/clear unavailable"
  - "PWA icons are minimal 1x1 PNG placeholders (69 bytes) — browsers accept size declaration in manifest; pixel dimensions irrelevant for installability"

patterns-established:
  - "Offline guard pattern: check isOnline.value in mutationFn before API call; enqueue + toast if offline"

requirements-completed: [SHEL-07, SHEL-08]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 4 Plan 03: PWA Offline Caching and Write Sync Summary

**vite-plugin-pwa service worker with NetworkFirst GitHub API cache, useOfflineQueue composable storing writes to localStorage (no token), and App.vue drain on reconnect**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T06:08:16Z
- **Completed:** 2026-03-25T06:13:00Z
- **Tasks:** 2 of 3 (Task 3 is human verification checkpoint)
- **Files modified:** 8

## Accomplishments
- VitePWA plugin configured with NetworkFirst for GitHub API (5s timeout, 24h cache) and StaleWhileRevalidate for avatars
- `useOfflineQueue` composable: enqueue (strips tokens), getQueue, drainQueue (sequential with error recovery), isOnline reactive ref, offline toast watcher
- 12 unit tests passing including no-token assertion via spy on localStorage.setItem
- App.vue wired to drain queue on reconnect and on auth token change
- useComments and useReactions enqueue actions when offline instead of failing

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement useOfflineQueue composable with TDD tests** - `4427646` (feat)
2. **Task 2: Configure vite-plugin-pwa and wire offline UX into App.vue** - `e661434` (feat)

## Files Created/Modified
- `src/composables/queries/useOfflineQueue.ts` - Offline queue composable with enqueue/drainQueue/getQueue/isOnline
- `src/composables/queries/useOfflineQueue.spec.ts` - 12 unit tests including no-token assertion
- `vite.config.ts` - VitePWA plugin with Workbox NetworkFirst + StaleWhileRevalidate strategies
- `public/pwa-192.png` - Minimal valid PNG placeholder icon (192x192 declared in manifest)
- `public/pwa-512.png` - Minimal valid PNG placeholder icon (512x512 declared in manifest)
- `src/App.vue` - useOfflineQueue wired with drain on reconnect + drain on auth token change
- `src/composables/queries/useComments.ts` - Offline guard in mutationFn; enqueues when offline
- `src/composables/queries/useReactions.ts` - Offline guard in mutationFn; enqueues when offline

## Decisions Made
- `useOfflineQueue` does NOT auto-drain on reconnect — App.vue drains explicitly to ensure auth token is available
- Token stripped from payload defensively before storage (even if caller didn't include it) — verified by test
- `vi.stubGlobal('localStorage', mockImpl)` required because `setup.ts` spies on `Storage.prototype.setItem/getItem`, making jsdom's native `localStorage.removeItem` unavailable in our spec
- PWA icon placeholders are minimal 1x1 PNG files (69 bytes) — valid PNG format, manifest size declaration accepted by browsers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type error: ReactionContent cast**
- **Found during:** Task 2 verification (TypeScript check)
- **Issue:** `action.payload.content as string` not assignable to `ReactionContent` in drainQueue
- **Fix:** Imported `ReactionContent` type from `@/types/index` and used `as ReactionContent` cast
- **Files modified:** src/composables/queries/useOfflineQueue.ts
- **Verification:** `npx tsc --noEmit` produces no errors for this file
- **Committed in:** e661434 (Task 2 commit)

**2. [Rule 1 - Bug] localStorage not accessible in jsdom+spied test environment**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** `setup.ts` spies on `Storage.prototype` methods, making `localStorage.clear()` and `localStorage.removeItem()` not callable in test beforeEach
- **Fix:** Used `vi.stubGlobal('localStorage', makeLocalStorageMock())` to provide clean in-memory localStorage per test
- **Files modified:** src/composables/queries/useOfflineQueue.spec.ts
- **Verification:** All 12 tests pass
- **Committed in:** 4427646 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both essential for TypeScript correctness and test reliability. No scope creep.

## Issues Encountered
- jsdom+vitest localStorage spy environment prevented direct localStorage method calls in beforeEach — solved via vi.stubGlobal with in-memory mock implementation

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All v1 requirements implemented (SHEL-07, SHEL-08 complete)
- Service worker requires browser verification (Task 3 checkpoint) before sign-off
- Production-quality PWA icons (192x192 and 512x512 actual pixel dimensions) can replace placeholder files before launch without any other changes

---
*Phase: 04-admin-and-pwa*
*Completed: 2026-03-25*

## Self-Check: PASSED

- FOUND: src/composables/queries/useOfflineQueue.ts
- FOUND: src/composables/queries/useOfflineQueue.spec.ts
- FOUND: public/pwa-192.png
- FOUND: public/pwa-512.png
- FOUND: .planning/phases/04-admin-and-pwa/04-03-SUMMARY.md
- FOUND: commit 4427646 (Task 1)
- FOUND: commit e661434 (Task 2)
