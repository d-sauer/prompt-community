---
phase: 14
slug: admin-moderation-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (two configs) |
| **Config file (worker)** | `vitest.workers.config.ts` — `@cloudflare/vitest-pool-workers`, workerd runtime |
| **Config file (frontend)** | `vitest.config.ts` — jsdom, excludes `src/workers/**` |
| **Quick run command (worker)** | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` |
| **Quick run command (frontend)** | `npx vitest run src/composables/queries/useAdmin` |
| **Full suite command** | `npx vitest run && npx vitest run --config vitest.workers.config.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the relevant spec file only (worker or frontend per task type)
- **After every plan wave:** Run `npx vitest run && npx vitest run --config vitest.workers.config.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 0 | API-22,23,24,25,26,28 | worker integration | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | API-22 | worker integration | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | API-23 | worker integration | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` | ❌ W0 | ⬜ pending |
| 14-02-03 | 02 | 1 | API-24 | worker integration | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` | ❌ W0 | ⬜ pending |
| 14-02-04 | 02 | 1 | API-25 | worker integration | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` | ❌ W0 | ⬜ pending |
| 14-02-05 | 02 | 1 | API-26 | worker integration | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` | ❌ W0 | ⬜ pending |
| 14-02-06 | 02 | 1 | API-27 | grep audit + integration | `grep -r 'c.json(' src/workers/api/routes/ src/workers/api/middleware/` | ✅ | ⬜ pending |
| 14-02-07 | 02 | 1 | API-28 | worker integration | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 2 | FRONT-06 | frontend unit | `npx vitest run src/composables/queries/useAdminQueue` | ✅ | ⬜ pending |
| 14-03-02 | 03 | 2 | FRONT-06 | frontend unit | `npx vitest run src/composables/queries/useAdminActions` | ✅ | ⬜ pending |
| 14-03-03 | 03 | 2 | FRONT-06 | frontend unit | `npx vitest run src/composables/queries/useAdminLog` | ✅ | ⬜ pending |
| 14-03-04 | 03 | 2 | FRONT-06 | frontend unit | `npx vitest run src/composables/queries/useAdminLabels` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/workers/api/routes/admin.spec.ts` — stubs/failing tests for API-22, API-23, API-24, API-25, API-26, API-28

*Frontend composable spec files already exist — not Wave 0 gaps. They need mock targets updated, not created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| featureMutation removal has no UI regressions | FRONT-06 | No automated check for "button hidden" in admin queue UI | Load AdminQueueTab.vue in browser; verify no feature button or graceful no-op |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
