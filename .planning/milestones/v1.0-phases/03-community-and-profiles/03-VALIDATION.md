---
phase: 3
slug: community-and-profiles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-W0 | 01 | 0 | COMM-01, COMM-02 | unit stub | `npm test -- useReactions` | ❌ W0 | ⬜ pending |
| 3-01-W0 | 01 | 0 | COMM-03, COMM-04 | unit stub | `npm test -- useComments` | ❌ W0 | ⬜ pending |
| 3-01-W0 | 01 | 0 | COMM-06 | unit stub | `npm test -- useFlagPrompt` | ❌ W0 | ⬜ pending |
| 3-01-W0 | 01 | 0 | USER-05 | unit stub | `npm test -- useBookmarksStore` | ❌ W0 | ⬜ pending |
| 3-01-W0 | 01 | 0 | USER-03, USER-06 | unit stub | `npm test -- useUserProfile` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | COMM-01 | unit | `npm test -- useReactions` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | COMM-02 | unit | `npm test -- useReactions` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | COMM-01/02 | unit | `npm test -- useReactions` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | COMM-05 | unit | `npm test -- ReactionBar` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 2 | COMM-03 | unit | `npm test -- useComments` | ❌ W0 | ⬜ pending |
| 3-01-06 | 01 | 2 | COMM-04 | unit | `npm test -- useComments` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | USER-05 | unit | `npm test -- useBookmarksStore` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | USER-03, USER-06 | unit | `npm test -- useUserProfile` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | COMM-06 | unit | `npm test -- useFlagPrompt` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/composables/queries/useReactions.spec.ts` — stubs for COMM-01, COMM-02
- [ ] `src/composables/queries/useComments.spec.ts` — stubs for COMM-03, COMM-04
- [ ] `src/composables/queries/useFlagPrompt.spec.ts` — stubs for COMM-06
- [ ] `src/stores/useBookmarksStore.spec.ts` — stubs for USER-05
- [ ] `src/composables/queries/useUserProfile.spec.ts` — stubs for USER-03, USER-06

*(No new framework setup needed — vitest, jsdom, @pinia/testing all installed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Public profile view shows correct user data | USER-03 | Requires real GitHub auth + live data | Sign in, visit `/users/:login`, verify submissions and stats display |
| Own profile tabs navigate correctly | USER-04 | UI tab interaction with state | Sign in, visit `/profile`, switch between tabs, verify content per tab |
| Sign-in CTA shown to unauthenticated user | COMM-05 | Auth state UI flow | Log out, view prompt, attempt reaction, verify CTA appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
