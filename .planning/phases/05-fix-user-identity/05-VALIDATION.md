---
phase: 5
slug: fix-user-identity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (globals: true, jsdom environment) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/stores/useAuthStore.spec.ts src/views/ProfileRedirectView.spec.ts src/components/layout/Navbar.spec.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/stores/useAuthStore.spec.ts src/views/ProfileRedirectView.spec.ts src/components/layout/Navbar.spec.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | USER-04 | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ❌ W0 extend | ⬜ pending |
| 5-01-02 | 01 | 0 | USER-04 | unit | `npx vitest run src/views/ProfileRedirectView.spec.ts` | ❌ W0 new | ⬜ pending |
| 5-01-03 | 01 | 0 | SHEL-01 | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ❌ W0 new | ⬜ pending |
| 5-01-04 | 01 | 1 | USER-04 | unit | `npx vitest run src/stores/useAuthStore.spec.ts -t "fetchCurrentUser"` | ❌ W0 | ⬜ pending |
| 5-01-05 | 01 | 1 | USER-04 | unit | `npx vitest run src/views/ProfileRedirectView.spec.ts` | ❌ W0 | ⬜ pending |
| 5-01-06 | 01 | 1 | SHEL-01 | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/views/ProfileRedirectView.spec.ts` — covers USER-04: redirect when user set, unauthenticated message, 5s timeout
- [ ] `src/components/layout/Navbar.spec.ts` — covers SHEL-01: Profile DropdownMenuItem @click navigates to /profile
- [ ] Extend `src/stores/useAuthStore.spec.ts` — add `fetchCurrentUser` test cases (USER-04): populates user, handles failure, calls verifyMaintainerStatus

*No framework install needed — `vitest.config.ts` and `src/test/setup.ts` already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub OAuth flow populates user in Navbar after real login | USER-04 | Requires live GitHub OAuth callback; cannot mock OAuth redirect in unit tests | Login with GitHub → verify Navbar shows username |
| `repositories(privacy: PUBLIC)` scope works with OAuth grant | USER-04 | Requires live GitHub API call to verify scope | After login, check profile page shows public repo count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
