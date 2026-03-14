---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [vue3, vite, typescript, pinia, vue-router, vitest, tailwind, shadcn-vue, cloudflare-pages, cloudflare-workers, tanstack-query, vueuse, octokit, minisearch]

# Dependency graph
requires: []
provides:
  - Vue 3 + TypeScript SPA skeleton scaffolded and buildable
  - Tailwind CSS v4 + shadcn-vue component system installed (command, sheet, avatar, dropdown-menu, tooltip, badge, separator, button)
  - Pinia store topology: useAuthStore, useUIStore, usePromptsStore, useSearchStore
  - Vue Router with all Phase 1+ routes and beforeEach guard skeleton
  - Vitest 4 configured with jsdom, path aliases, global mocks
  - Wave 0 test stubs for all 8 spec files
  - public/_redirects with CF Pages SPA fallback rule
  - wrangler.toml for OAuth Worker deployment
  - src/workers/oauth.ts OAuth Worker implementation
  - src/types/index.ts shared TypeScript interfaces
affects:
  - 01-02
  - 01-03
  - all subsequent plans

# Tech tracking
tech-stack:
  added:
    - Vue 3.5.x
    - Vite 8.0.x
    - TypeScript strict
    - Pinia 3.0.4
    - Vue Router 5.0.3
    - TanStack Vue Query 5.92.x
    - Tailwind CSS 4.2.1
    - shadcn-vue 2.4.3 (new-york style)
    - Reka UI 2.9.x
    - "@vueuse/core 14.2.1"
    - "@octokit/graphql 9.0.3"
    - "@octokit/core 7.0.6"
    - yaml 2.8.2
    - minisearch 7.2.0
    - Vitest 4.1.0
    - "@vue/test-utils 2.4.6"
    - "@vitest/coverage-v8"
    - wrangler 4.73.x
    - tw-animate-css 1.4.x
    - clsx, tailwind-merge, class-variance-authority
    - lucide-vue-next
  patterns:
    - Memory-only Pinia token ref for auth (INFR-07, never localStorage)
    - OAuth popup + postMessage token handoff with closure-stored CSRF state
    - Vue Router beforeEach guard with maintainer stub (verifyMaintainerStatus)
    - CF Pages SPA fallback via public/_redirects copied by Vite's publicDir
    - shadcn-vue copy-in model with @/lib/utils cn() helper
    - Vitest jsdom + global mocks in src/test/setup.ts
    - Legacy-peer-deps .npmrc for Tailwind v4 + Vite 8 compatibility

key-files:
  created:
    - src/types/index.ts
    - src/main.ts
    - src/App.vue
    - src/router/index.ts
    - src/stores/useAuthStore.ts
    - src/stores/useUIStore.ts
    - src/stores/usePromptsStore.ts
    - src/stores/useSearchStore.ts
    - src/workers/oauth.ts
    - src/views/BrowseView.vue
    - src/views/PromptDetailView.vue
    - src/views/PromptEditorView.vue
    - src/views/AdminView.vue
    - src/lib/utils.ts
    - src/style.css (updated by shadcn-vue with Tailwind v4 CSS vars)
    - src/test/setup.ts
    - src/stores/useAuthStore.spec.ts
    - src/stores/useUIStore.spec.ts
    - src/composables/useKeyboardShortcuts.spec.ts
    - src/router/index.spec.ts
    - src/components/layout/NotificationDrawer.spec.ts
    - src/workers/oauth.spec.ts
    - vitest.config.ts
    - vite.config.ts
    - tsconfig.app.json
    - tsconfig.json
    - public/_redirects
    - .env.example
    - wrangler.toml
    - components.json
  modified:
    - .gitignore (added .env entries)
    - package.json (added scripts, all dependencies)

key-decisions:
  - "CSRF state stored in closure variable before window.open (not sessionStorage — sessionStorage not shared between opener and popup)"
  - "Worker echoes state param back in postMessage payload for SPA to verify"
  - "legacy-peer-deps=true set in .npmrc to resolve @tailwindcss/vite peer dep conflict with Vite 8"
  - "shadcn-vue installed manually in two steps due to npm install failure in init; lib/utils.ts created manually"
  - "src/workers/oauth.ts uses JSON.stringify for access_token injection (XSS-safe vs string interpolation)"

patterns-established:
  - "Pattern: Pinia setup store with plain ref<string | null> for auth token — never useLocalStorage"
  - "Pattern: Vue Router exported as named export `router` from src/router/index.ts"
  - "Pattern: verifyMaintainerStatus exported separately for testability (mockable in router specs)"
  - "Pattern: View components are minimal stubs using useRoute().name for placeholder text"
  - "Pattern: Wave 0 spec files use it.todo() stubs so Vitest recognizes them without implementing"

requirements-completed:
  - INFR-09
  - INFR-10

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 1 Plan 01: SPA Skeleton Summary

**Vue 3 + TypeScript SPA scaffolded with Pinia store topology, Vue Router 5, Tailwind v4 + shadcn-vue, Vitest 4 test infrastructure, and Cloudflare Pages/Workers deployment config**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-14T22:23:06Z
- **Completed:** 2026-03-14T22:31:00Z
- **Tasks:** 2
- **Files modified:** ~100 (greenfield scaffold)

## Accomplishments

- Full Vue 3 SPA buildable with zero TypeScript errors; `npm run build` produces dist/ with correct SPA fallback
- All 4 Pinia stores (useAuthStore, useUIStore, usePromptsStore, useSearchStore) implemented with correct TypeScript types and memory-only auth token (INFR-07)
- Vue Router configured with all routes and beforeEach guard; maintainer verification stub exported for testability
- Vitest 4 configured with jsdom + path aliases; 12 tests pass, 13 Wave 0 todo stubs recognized
- OAuth Worker implementation in src/workers/oauth.ts with CSRF state echo in postMessage
- Cloudflare Pages deployment ready: public/_redirects contains `/* /index.html 200`; wrangler.toml configured

## Task Commits

1. **Task 1: Scaffold project, install deps, types, config** - `f97ce64` (feat)
2. **Task 2: Pinia stores, Vue Router, Vitest, Wave 0 stubs** - `aeaab73` (feat)

## Files Created/Modified

- `src/types/index.ts` — GitHubUser, FilterState, SortOrder, Prompt, AuthState interfaces
- `src/main.ts` — App bootstrap with Pinia, Vue Router, VueQueryPlugin
- `src/router/index.ts` — All routes, beforeEach guard, exported verifyMaintainerStatus stub
- `src/stores/useAuthStore.ts` — Memory-only token, login/logout/receiveToken, OAuth popup
- `src/stores/useUIStore.ts` — sidebarCollapsed, notificationDrawerOpen, commandPaletteOpen, theme
- `src/stores/usePromptsStore.ts` — filterState, sortOrder with setters
- `src/stores/useSearchStore.ts` — query, results with setters
- `src/workers/oauth.ts` — CF Worker OAuth proxy with /login redirect and /callback exchange
- `vitest.config.ts` — Vitest 4 config with jsdom, globals, path aliases, coverage
- `src/test/setup.ts` — Global mocks: window.open, localStorage spy
- `src/stores/useAuthStore.spec.ts` — 5 passing tests including INFR-07 localStorage check
- `src/stores/useUIStore.spec.ts` — 7 passing tests for sidebar, command palette state
- Wave 0 stubs: useKeyboardShortcuts, router guard, NotificationDrawer, OAuth Worker
- `public/_redirects` — CF Pages SPA fallback rule
- `vite.config.ts` — Tailwind v4 plugin, @/ alias, __APP_VERSION__ define
- `.env.example` — All 6 VITE_ vars documented

## Decisions Made

- **CSRF state in closure, not sessionStorage:** Research doc identified that sessionStorage is not shared between popup window and opener. State is stored in a closure variable before `window.open()`, and the Worker echoes it back in the postMessage payload for the SPA to verify.
- **Two-step shadcn-vue init:** The `npx shadcn-vue@latest init --defaults` command failed mid-way because `@tailwindcss/vite` has a peer dep conflict with Vite 8. Set `legacy-peer-deps=true` in project `.npmrc` and installed shadcn components manually after creating `src/lib/utils.ts`.
- **XSS-safe token injection in Worker:** Used `JSON.stringify(access_token)` instead of raw string interpolation in the Worker's `<script>` response to prevent XSS if the token contains special characters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created src/lib/utils.ts missing from shadcn-vue init**
- **Found during:** Task 1 (build verification)
- **Issue:** shadcn-vue init failed mid-way due to peer dep conflict, leaving `src/lib/utils.ts` uncreated; 37 shadcn components had unresolved import
- **Fix:** Created `src/lib/utils.ts` with `cn()` helper using clsx + tailwind-merge, installed `tw-animate-css` dep added to CSS by shadcn
- **Files modified:** src/lib/utils.ts, package.json
- **Verification:** `npm run build` completed with zero errors
- **Committed in:** f97ce64 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed localStorage.setItem spy not working in beforeEach**
- **Found during:** Task 2 (test run)
- **Issue:** `localStorage.setItem` spy set up in setup.ts was `undefined` in the test because jsdom's localStorage implementation doesn't inherit from `Storage.prototype` when spied globally before env setup
- **Fix:** Moved spy to within the INFR-07 test itself using `vi.spyOn(Storage.prototype, 'setItem')`
- **Files modified:** src/stores/useAuthStore.spec.ts
- **Verification:** INFR-07 test passes
- **Committed in:** aeaab73 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for build and test correctness. No scope creep.

## Issues Encountered

- `@tailwindcss/vite 4.2.1` declares peer dependency on Vite `^5.2.0 || ^6 || ^7` but project uses Vite 8. Resolved by setting `legacy-peer-deps=true` in project `.npmrc`. Tailwind v4 works with Vite 8 in practice despite the declared peer dep range.
- `create-vite` refused to scaffold into non-empty directory. Scaffolded in `/tmp` then copied files over.

## User Setup Required

Cloudflare Pages and Workers require manual external configuration:

**Cloudflare Pages:**
1. Connect GitHub repo at Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git
2. Set build command: `npm run build`, output dir: `dist`

**Cloudflare Workers (OAuth):**
1. Deploy worker: `npm run deploy:worker`
2. Set secrets: `wrangler secret put CLIENT_SECRET` and `wrangler secret put CLIENT_ID`
3. Update `APP_ORIGIN` in wrangler.toml to match actual Pages domain

**Environment Variables (.env file, never committed):**
- `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_CLIENT_ID`
- `VITE_CF_WORKER_URL`, `VITE_R2_PUBLIC_URL`, `VITE_GITHUB_APP_INSTALLATION_ID`

See `.env.example` for full documentation.

## Next Phase Readiness

- SPA skeleton ready for Plan 02 (GitHub OAuth end-to-end) and Plan 03 (App shell UI)
- Store topology established — Plans 02 and 03 can import and extend without changes
- Wave 0 todo stubs in place — Plans 02 and 03 will implement them as tests pass
- No blockers for subsequent plans

---
*Phase: 01-foundation*
*Completed: 2026-03-14*
