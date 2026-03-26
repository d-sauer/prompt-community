---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` — Wave 0 creates |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/stores/ src/composables/`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| setup-vitest | 01-01 | 0 | — | infra | `npx vitest run` | ❌ W0 | ⬜ pending |
| oauth-store | 01-02 | 1 | USER-01, USER-02, INFR-07 | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ❌ W0 | ⬜ pending |
| oauth-worker | 01-02 | 1 | INFR-04 | unit | `npx vitest run src/workers/oauth.spec.ts` | ❌ W0 | ⬜ pending |
| router-guard | 01-02 | 1 | INFR-08 | unit | `npx vitest run src/router/index.spec.ts` | ❌ W0 | ⬜ pending |
| ui-store | 01-03 | 2 | SHEL-03, SHEL-04 | unit | `npx vitest run src/stores/useUIStore.spec.ts` | ❌ W0 | ⬜ pending |
| keyboard-shortcuts | 01-03 | 2 | SHEL-01, SHEL-02 | unit | `npx vitest run src/composables/useKeyboardShortcuts.spec.ts` | ❌ W0 | ⬜ pending |
| notification-drawer | 01-03 | 2 | SHEL-05 | component | `npx vitest run src/components/layout/NotificationDrawer.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — framework config with path aliases (`@/` → `src/`), jsdom environment, coverage settings
- [ ] `src/test/setup.ts` — shared test setup: jsdom globals, mocks for `window.open`, `window.postMessage`, `localStorage`
- [ ] `src/stores/useAuthStore.spec.ts` — stubs for USER-01 (postMessage token receipt), USER-02 (sign out clears state), INFR-07 (token never written to localStorage)
- [ ] `src/stores/useUIStore.spec.ts` — stubs for SHEL-03 (theme persists to localStorage), SHEL-04 (sidebar collapse toggles)
- [ ] `src/composables/useKeyboardShortcuts.spec.ts` — stubs for SHEL-01 (⌘K opens search), SHEL-02 (G+B navigate, G+N navigate, suppressed in inputs)
- [ ] `src/router/index.spec.ts` — stubs for INFR-08 (admin route guard calls GitHub API)
- [ ] `src/components/layout/NotificationDrawer.spec.ts` — stubs for SHEL-05 (empty state when count = 0)
- [ ] `src/workers/oauth.spec.ts` — stubs for INFR-04 (Worker login/callback routes, CSRF state, postMessage response)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CF Pages `_redirects` present in dist | INFR-10 | Build artifact inspection | `npm run build && cat dist/_redirects` — verify contains `/* /index.html 200` |
| OAuth popup flow end-to-end | USER-01 | Real browser + real CF Worker | Open app, click Sign in, complete GitHub OAuth, verify popup closes and auth state updates |
| CF Pages deployment within free tier | INFR-09, INFR-10 | Cloudflare dashboard inspection | Verify Pages build succeeds; Workers dashboard shows deployment |
| Token absent from localStorage after login | INFR-07 | Browser DevTools | Login → DevTools → Application → Local Storage → confirm no token key present |
| Sidebar responsive at 3 breakpoints | SHEL-06 | Browser resize | Resize to <640px (Sheet overlay), 640-1023px (collapsed 48px), 1024px+ (expanded 200px) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
