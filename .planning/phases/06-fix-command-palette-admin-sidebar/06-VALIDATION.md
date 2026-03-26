---
phase: 6
slug: fix-command-palette-admin-sidebar
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (jsdom environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/components/layout/Navbar.spec.ts src/router/index.spec.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/layout/Navbar.spec.ts src/router/index.spec.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | SHEL-01 | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ needs new cases | ⬜ pending |
| 6-01-02 | 01 | 0 | ADMN-01 | unit | `npx vitest run src/router/index.spec.ts` | ✅ needs new cases | ⬜ pending |
| 6-01-03 | 01 | 1 | SHEL-01 | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ needs new cases | ⬜ pending |
| 6-01-04 | 01 | 1 | SHEL-01 | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ needs new cases | ⬜ pending |
| 6-01-05 | 01 | 1 | SHEL-01 | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ needs new cases | ⬜ pending |
| 6-01-06 | 01 | 1 | ADMN-01 | unit | `npx vitest run src/router/index.spec.ts` | ✅ needs new cases | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/layout/Navbar.spec.ts` — add: search store wiring tests (SHEL-01). File exists — add test cases covering: `@input` calls `searchStore.setQuery`, palette close resets query, `CommandItem` list renders from `searchStore.results`, selecting a result navigates to `/prompts/:id`
- [ ] `src/router/index.spec.ts` — add: `authStore.isMaintainer` write-back tests (ADMN-01). File exists — add: write-back `true` when `verifyMaintainerStatus` returns `true`; write-back `false` when it returns `false`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ⌘K opens palette in browser | SHEL-01 | Keyboard shortcut requires real browser | Open app, press ⌘K, verify palette opens |
| Admin sidebar links visible after /admin nav | ADMN-01 | Requires authenticated session + real router | Log in as maintainer, navigate to /admin, verify sidebar admin links appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
