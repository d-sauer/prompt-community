---
phase: 15
slug: decommission-docs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (jsdom) + `vitest.workers.config.ts` (workerd) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run test:workers` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run test:workers`
- **Before `/gsd:verify-work`:** `npm run build && npm test && npm run test:workers` all green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-??-01 | 01 | 1 | DECOM-01..05 | build gate | `npm run build` | N/A — compiler | ⬜ pending |
| 15-??-02 | 01 | 1 | DECOM-01..05 | test suite | `npm test && npm run test:workers` | ✅ existing | ⬜ pending |
| 15-??-03 | 02 | 2 | DEPLOY-01 | smoke test | `curl .../me` → 401 JSON | manual | ⬜ pending |
| 15-??-04 | 02 | 2 | DEPLOY-02 | smoke test | `wrangler d1 execute ... --remote` | manual | ⬜ pending |
| 15-??-05 | 02 | 2 | DEPLOY-03 | verification | `wrangler secret list ...` | manual | ⬜ pending |
| 15-??-06 | 03 | 3 | DECOM-08 | manual review | `grep "VITE_GITHUB_OWNER" .env.example` → empty | manual | ⬜ pending |
| 15-??-07 | 03 | 3 | DECOM-13 | manual review | File inspection for superseded banner | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 setup needed — existing vitest suites are the verification mechanism for all DECOM requirements (deleting files must not break existing tests). DEPLOY requirements are operator/manual tasks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker responds after deploy | DEPLOY-01 | Requires live Cloudflare infra | `curl https://YOUR_WORKER.workers.dev/me` returns 401 JSON |
| D1 schema exists in production | DEPLOY-02 | Requires live D1 | `wrangler d1 execute prompt-community-db --command "SELECT name FROM sqlite_master" --remote` |
| Secrets set, no plaintext in config | DEPLOY-03 | Requires wrangler auth | `wrangler secret list --config src/workers/api/wrangler.toml` |
| Production secrets configured | DEPLOY-04 | Requires live infra | Verify `wrangler.toml` has no plaintext secrets |
| `.env.example` has no v1 vars | DECOM-08 | File review | `grep "VITE_GITHUB_OWNER\|VITE_GITHUB_DATA_REPO" .env.example` returns empty |
| Research doc has superseded banner | DECOM-13 | File review | Inspect research doc for v1 superseded banner |
| prompt-community-data repo archived | DECOM-07 (partial) | GitHub action | Verify repo archived via GitHub UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
