---
phase: 10
slug: auth-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest `^4.1.0` + `@cloudflare/vitest-pool-workers ^0.15.2` |
| **Config file** | `vitest.workers.config.ts` |
| **Quick run command** | `npm run test:workers` |
| **Full suite command** | `npm run test:workers && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:workers`
- **After every plan wave:** Run `npm run test:workers && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-W0-01 | W0 | 0 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07, AUTH-08, AUTH-09 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-W0-02 | W0 | 0 | AUTH-05 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-W0-03 | W0 | 0 | AUTH-06 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-W0-04 | W0 | 0 | AUTH-10 | unit (jsdom) | `npm run test` | ❌ W0 | ⬜ pending |
| 10-01-01 | 01 | 1 | AUTH-01, AUTH-09 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | AUTH-02 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | AUTH-03, AUTH-04 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | AUTH-05 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | AUTH-06 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 1 | AUTH-07 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 1 | AUTH-08 | integration | `npm run test:workers` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 2 | AUTH-10 | unit (jsdom) | `npm run test` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 | 2 | DEV-04 | manual | — | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/workers/api/routes/auth.spec.ts` — stubs for AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07, AUTH-08, AUTH-09
- [ ] `src/workers/api/middleware/auth.spec.ts` — stubs for AUTH-05 (token_missing, token_expired)
- [ ] `src/workers/api/middleware/role.spec.ts` — stubs for AUTH-06
- [ ] `src/stores/useAuthStore.spec.ts` (update existing) — covers AUTH-10

*All tests are Wave 0 gaps — no existing coverage for auth functionality.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Separate OAuth Apps configured for dev/prod, switchable via `GITHUB_CLIENT_ID` | DEV-04 | Requires GitHub App console access and env var inspection | 1. Verify two GitHub OAuth Apps exist (dev + prod). 2. Confirm `GITHUB_CLIENT_ID` in `.dev.vars` points to dev app. 3. Confirm prod secret set in Cloudflare dashboard. 4. Test callback URL matches for each env. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
