---
phase: 7
slug: wire-etag-caching
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (v8 coverage) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/github/etag.spec.ts src/lib/github/octokit.spec.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/github/etag.spec.ts src/lib/github/octokit.spec.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | INFR-05 | unit | `npx vitest run src/lib/github/etag.spec.ts` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | INFR-05 | unit | `npx vitest run src/lib/github/etag.spec.ts` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | INFR-05 | unit | `npx vitest run src/lib/github/octokit.spec.ts` | ❌ extend | ⬜ pending |
| 7-01-04 | 01 | 1 | INFR-05 | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ❌ extend | ⬜ pending |
| 7-01-05 | 01 | 1 | INFR-05 | unit | `npx vitest run src/composables/queries/useAdminLabels.spec.ts` | ❌ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/github/etag.spec.ts` — covers INFR-05 (localStorage storage, per-user scoping, 50-entry LRU cap, clearUserEtags, If-None-Match injection, ETag capture from response)
- [ ] Extend `src/lib/github/octokit.spec.ts` — add test asserting `createRestClient` passes a custom fetch to Octokit constructor
- [ ] Extend `src/stores/useAuthStore.spec.ts` — add test asserting `logout()` calls `clearUserEtags`
- [ ] Extend `src/composables/queries/useAdminLabels.spec.ts` — add tests asserting label create/update/delete `onSuccess` calls `clearEtag`

*No new framework install needed — Vitest + jsdom already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 304 response consumes zero GitHub rate-limit quota | INFR-05 | Requires live GitHub API; rate-limit quota is not mockable in unit tests | Sign in, load labels page, reload — DevTools Network tab should show 304 on second GET /labels call; GitHub rate-limit headers should show no decrement |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
