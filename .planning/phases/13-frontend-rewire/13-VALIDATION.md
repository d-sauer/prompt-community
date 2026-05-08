---
phase: 13
slug: frontend-rewire
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-08
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.x (jsdom environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/composables/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/composables/queries/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | FRONT-01 | unit | `npx vitest run src/lib/api/http.spec.ts` | ❌ created by task | ⬜ pending |
| 13-01-02 | 01 | 1 | FRONT-02, FRONT-03, FRONT-04, FRONT-05 | unit | `npx vitest run src/lib/api/queries.spec.ts src/lib/api/mutations.spec.ts` | ❌ created by task | ⬜ pending |
| 13-02-01 | 02 | 1 | FRONT-09 | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ✅ | ⬜ pending |
| 13-02-02 | 02 | 1 | FRONT-09 | grep | `grep -n "post('/logout'" src/workers/api/routes/auth.ts` | N/A | ⬜ pending |
| 13-03-01 | 03 | 2 | FRONT-07 | unit | `npx vitest run src/composables/queries/usePromptsQuery.spec.ts` | ❌ created by task | ⬜ pending |
| 13-03-02 | 03 | 2 | FRONT-11 | unit | `npx vitest run src/composables/queries/useUserActivity.spec.ts` | ❌ created by task | ⬜ pending |
| 13-04-01 | 04 | 2 | FRONT-08 | grep | `grep -rn "@/lib/github" src/composables/queries/useComments.ts src/composables/queries/useReactions.ts src/composables/queries/useOfflineQueue.ts \| wc -l` (expect 0) | N/A | ⬜ pending |
| 13-04-02 | 04 | 2 | FRONT-10 (partial) | grep | `grep -rn "@/lib/github" src/composables/queries/useCreatePrompt.ts src/composables/queries/useUpdatePrompt.ts src/composables/queries/useFlagPrompt.ts src/composables/queries/useRestoreVersion.ts \| wc -l` (expect 0) | N/A | ⬜ pending |
| 13-05-01 | 05 | 3 | SEARCH-03 | unit | `npx vitest run` | N/A (full suite) | ⬜ pending |
| 13-05-02 | 05 | 3 | SEARCH-04 | manual | `npx vite build && inspect dev-dist/sw.js` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave Structure

| Wave | Plans | Creates spec files? |
|------|-------|---------------------|
| 1 | 13-01, 13-02 | Yes — http.spec.ts, queries.spec.ts, mutations.spec.ts (Plan 01 Task 2) |
| 2 | 13-03, 13-04 | Yes — usePromptsQuery.spec.ts, useUserActivity.spec.ts (Plan 03) |
| 3 | 13-05 | No — updates existing specs |

Wave 1 (Plans 01 and 02) serves as the combined foundation layer. Spec files required by downstream composables are created in Plan 01 Task 2 and Plan 03 Task 1. There is no separate Wave 0 — `wave_0_complete: true` because Plan 01 subsumes the Wave 0 responsibilities.

---

## Spec Files Created by Phase 13

| Spec File | Created In | Requirement Covered |
|-----------|-----------|---------------------|
| src/lib/api/http.spec.ts | Plan 01 Task 2 | FRONT-01 |
| src/lib/api/queries.spec.ts | Plan 01 Task 2 | FRONT-02, FRONT-05 |
| src/lib/api/mutations.spec.ts | Plan 01 Task 2 | FRONT-03, FRONT-04 |
| src/composables/queries/usePromptsQuery.spec.ts | Plan 03 Task 1 | FRONT-07 |
| src/composables/queries/useUserActivity.spec.ts | Plan 03 Task 2 | FRONT-11 |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SW runtimeCaching matches API URL pattern | SEARCH-04 | Build artifact inspection required | `npx vite build && grep -A5 "runtimeCaching" dev-dist/sw.js` — confirm API path prefix is matched |

---

## Partial Requirement Notes

| Requirement | Partial Delivery | Full Delivery |
|-------------|-----------------|---------------|
| FRONT-10 | Phase 13 (Plan 04): ETag logic removed from all active composable code paths; etag.ts not imported by any Phase 13 composable | Phase 15 (DECOM-04): src/lib/github/etag.ts file deletion |
| FRONT-06 | Not in Phase 13 scope | Phase 14: admin composable rewire (src/lib/api/admin.ts creation + admin composable migration) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or created-by-task spec files listed above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] All MISSING spec references are created by Plan 01 Task 2 or Plan 03 Task 1
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
