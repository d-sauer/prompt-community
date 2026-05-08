---
phase: 13
slug: frontend-rewire
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 13-01-01 | 01 | 0 | FRONT-01 | unit | `npx vitest run src/lib/api/http.spec.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 0 | FRONT-02 | unit | `npx vitest run src/lib/api/queries.spec.ts` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 0 | FRONT-02 | unit | `npx vitest run src/lib/api/mutations.spec.ts` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 0 | FRONT-11 | unit | `npx vitest run src/composables/queries/useUserActivity.spec.ts` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | FRONT-07 | unit | `npx vitest run src/composables/queries/usePromptsQuery.spec.ts` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | FRONT-08 | unit | `npx vitest run src/composables/queries/useReactions.spec.ts` | ✅ | ⬜ pending |
| 13-02-03 | 02 | 1 | FRONT-09 | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ✅ | ⬜ pending |
| 13-02-04 | 02 | 1 | FRONT-10 | lint/tsc | `npx tsc --noEmit` | N/A | ⬜ pending |
| 13-02-05 | 02 | 1 | FRONT-11 | unit | `npx vitest run src/composables/queries/useUserActivity.spec.ts` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 2 | SEARCH-03 | unit | `npx vitest run src/lib/search.spec.ts` | ✅ | ⬜ pending |
| 13-03-02 | 03 | 2 | SEARCH-04 | manual | `npx vite build && inspect dev-dist/sw.js` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/api/http.spec.ts` — covers FRONT-01 (apiFetch error handling, credentials injection)
- [ ] `src/lib/api/queries.spec.ts` — covers FRONT-02, FRONT-05 (function existence + endpoint shape)
- [ ] `src/lib/api/mutations.spec.ts` — covers FRONT-02, FRONT-03, FRONT-04 (function existence + endpoint shape)
- [ ] `src/composables/queries/useUserActivity.spec.ts` — covers FRONT-11 (useInfiniteQuery, event mapping)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SW runtimeCaching matches API URL pattern | SEARCH-04 | Build artifact inspection required | `npx vite build && grep -A5 "runtimeCaching" dev-dist/sw.js` — confirm API path prefix is matched |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
