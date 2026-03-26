---
phase: 8
slug: fix-admin-search-tech-debt
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-26
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed, vitest.config.ts present) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/composables/queries/useAdminActions.spec.ts src/composables/queries/useAdminLog.spec.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/composables/queries/useAdminActions.spec.ts src/composables/queries/useAdminLog.spec.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | ADMN-08 | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts` | ✅ extend line 134 | ⬜ pending |
| 8-01-02 | 01 | 1 | INFR-05 | unit | `npx vitest run src/composables/queries/useAdminLog.spec.ts` | ✅ add test to existing file | ⬜ pending |
| 8-01-03 | 01 | 1 | CONT-01 | compile | `npx tsc --noEmit` | ✅ deletion verified by absence | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new files needed; only extensions to existing spec files.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
