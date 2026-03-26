---
phase: 2
slug: read-and-contribute
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run src/lib/ src/stores/ src/composables/queries/` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ src/stores/ src/composables/queries/`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-xx | 01 | 1 | DISC-05, INFR-03, INFR-06 | unit | `npx vitest run src/lib/search.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-01-xx | 01 | 1 | DISC-06 | unit | `npx vitest run src/lib/markdown.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-02-xx | 02 | 2 | CONT-07 | unit | `npx vitest run src/lib/frontmatter.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-02-xx | 02 | 2 | CONT-10, CONT-11 | unit | `npx vitest run src/stores/useDraftStore.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-02-xx | 02 | 2 | CONT-05 | unit | `npx vitest run src/workers/upload.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-03-xx | 03 | 3 | VERS-02 | unit | `npx vitest run src/composables/queries/usePromptVersions.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-03-xx | 03 | 3 | VERS-03 | unit | `npx vitest run src/lib/diff.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-03-xx | 03 | 3 | VERS-04 | unit | `npx vitest run src/composables/queries/useRestoreVersion.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-03-xx | 03 | 3 | VERS-05 | component | `npx vitest run src/components/versions/RestoreDialog.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 2-xx-xx | all | all | INFR-05 | integration | manual verification (rate limit monitoring) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/search.spec.ts` — stubs for DISC-05, INFR-03, INFR-06 (MiniSearch < 50ms, no API calls)
- [ ] `src/lib/frontmatter.spec.ts` — stubs for CONT-07 (YAML round-trip)
- [ ] `src/lib/markdown.spec.ts` — stubs for DISC-06 (code block rendering with Shiki)
- [ ] `src/lib/diff.spec.ts` — stubs for VERS-03 (trailing newline edge cases)
- [ ] `src/stores/useDraftStore.spec.ts` — stubs for CONT-10, CONT-11 (fake timers for auto-save interval, isDirty guard)
- [ ] `src/composables/queries/usePromptVersions.spec.ts` — stubs for VERS-02 (comment parse, version extraction)
- [ ] `src/composables/queries/useRestoreVersion.spec.ts` — stubs for VERS-04 (REST mock, comment body format)
- [ ] `src/components/versions/RestoreDialog.spec.ts` — stubs for VERS-05 (dialog cancel/confirm)
- [ ] `src/workers/upload.spec.ts` — stubs for CONT-05 (file type and size validation in Worker)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ETag sent on repeat requests (304 path) | INFR-05 | Integration with GitHub API network behavior; not easily unit-mockable | Open DevTools Network tab, load browse view twice, verify second request shows 304 and `If-None-Match` header |
| FCP < 1.5s with Shiki bundle loaded | INFR-01 | Requires real browser measurement | Run Lighthouse audit on `/` after build; verify FCP metric |
| Infinite scroll triggers at correct threshold | DISC-10 | DOM intersection behavior | Scroll to bottom of list, verify next page loads automatically |
| Unsaved-changes dialog appears on navigate | CONT-11 | Router guard requires real navigation | Edit form, click nav link without saving, verify dialog appears |
| Image drag-and-drop to editor | CONT-05 | Browser drag-and-drop API | Drag image file onto editor textarea, verify upload and markdown link insertion |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
