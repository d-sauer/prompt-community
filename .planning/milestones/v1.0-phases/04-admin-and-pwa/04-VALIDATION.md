---
phase: 4
slug: admin-and-pwa
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/composables/queries/useAdmin*.spec.ts src/composables/queries/useOfflineQueue.spec.ts` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/composables/queries/useAdmin*.spec.ts src/composables/queries/useOfflineQueue.spec.ts`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-W0 | 01 | 0 | ADMN-02 | unit | `npx vitest run src/composables/queries/useAdminStats.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-W0 | 01 | 0 | ADMN-03 | unit | `npx vitest run src/composables/queries/useAdminQueue.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-W0 | 01 | 0 | ADMN-04, ADMN-05, ADMN-07 | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-W0 | 01 | 0 | ADMN-06 | unit | `npx vitest run src/composables/queries/useAdminLabels.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-W0 | 01 | 0 | ADMN-08 | unit | `npx vitest run src/composables/queries/useAdminLog.spec.ts` | ❌ W0 | ⬜ pending |
| 4-02-W0 | 02 | 0 | SHEL-08 | unit | `npx vitest run src/composables/queries/useOfflineQueue.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-01 | 01 | 1 | ADMN-01 | unit | `npx vitest run src/router/index.spec.ts -t "admin"` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | ADMN-02 | unit | `npx vitest run src/composables/queries/useAdminStats.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | ADMN-03 | unit | `npx vitest run src/composables/queries/useAdminQueue.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | ADMN-04 | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 1 | ADMN-05 | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts -t "bulk"` | ❌ W0 | ⬜ pending |
| 4-01-06 | 01 | 1 | ADMN-06 | unit | `npx vitest run src/composables/queries/useAdminLabels.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-07 | 01 | 1 | ADMN-07 | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts -t "feature"` | ❌ W0 | ⬜ pending |
| 4-01-08 | 01 | 1 | ADMN-08 | unit | `npx vitest run src/composables/queries/useAdminLog.spec.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | SHEL-07 | manual-only | Manual: Chrome DevTools Application tab → Service Workers | N/A | ⬜ pending |
| 4-02-02 | 02 | 2 | SHEL-08 | unit | `npx vitest run src/composables/queries/useOfflineQueue.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/composables/queries/useAdminStats.spec.ts` — stubs for ADMN-02 (mock GraphQL, assert counts)
- [ ] `src/composables/queries/useAdminQueue.spec.ts` — stubs for ADMN-03 (mock paginated flag:review results)
- [ ] `src/composables/queries/useAdminActions.spec.ts` — stubs for ADMN-04, ADMN-05, ADMN-07 (mock removeLabel, addLabel, deleteIssueGraphQL, postModerationComment)
- [ ] `src/composables/queries/useAdminLabels.spec.ts` — stubs for ADMN-06 (namespace validation regex tests + mock REST label CRUD)
- [ ] `src/composables/queries/useAdminLog.spec.ts` — stubs for ADMN-08 (comment filter pattern, date range filter)
- [ ] `src/composables/queries/useOfflineQueue.spec.ts` — stubs for SHEL-08 (queue localStorage persistence, drain logic, no token assertion)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Service worker registered; NetworkFirst cache for API routes | SHEL-07 | Browser PWA registration and cache strategy require real browser environment; cannot be unit-tested | Open Chrome DevTools → Application → Service Workers; verify registered and running. Check Cache Storage for API route entries. Test offline mode via Network throttling → Offline. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
