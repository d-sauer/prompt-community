---
phase: 9
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already installed) + `@cloudflare/vitest-pool-workers` (Wave 0 gap) |
| **Config file** | `vitest.config.ts` (existing — frontend/jsdom) + `vitest.workers.config.ts` (new — workerd) |
| **Quick run command** | `npm test` (existing suite) and `npx vitest run --config vitest.workers.config.ts` (API worker) |
| **Full suite command** | `npm test && npx vitest run --config vitest.workers.config.ts && npx vue-tsc -b --noEmit` |
| **Estimated runtime** | ~30–45 seconds (existing suite + small API boot suite + tsc) |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (existing suite stays green; no regressions)
- **After every task commit (API work):** Run `npx vitest run --config vitest.workers.config.ts`
- **After every plan wave:** Run `npm test && npx vitest run --config vitest.workers.config.ts && npx vue-tsc -b --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green AND Phase Gate Checklist (below) must all pass
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Plans haven't been written yet — this map will be filled in by the planner with concrete `{N}-{plan}-{task}` IDs. The requirement-to-test mapping below is authoritative and the planner MUST honor it.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| BACK-01 | Hono worker boots; all route paths return a response (even 501) | Integration (workerd) | `npx vitest run --config vitest.workers.config.ts src/workers/api/index.spec.ts` | ❌ W0 | ⬜ pending |
| BACK-01 | Each route module file exists and exports a Hono app | Static (TypeScript compile) | `npx vue-tsc -b --noEmit` | ❌ tsc | ⬜ pending |
| BACK-02 | D1 binding `DB` accessible in handlers via `c.env.DB` | Integration (workerd) | Covered by BACK-01 boot test (asserts `env.DB` defined) | ❌ W0 | ⬜ pending |
| BACK-03 | Drizzle schema compiles without TypeScript errors | Static | `npx vue-tsc -b --noEmit` | ❌ tsc | ⬜ pending |
| BACK-04 | `drizzle-kit push` applies schema to local D1 with no errors | Shell (exit-code) | `npx drizzle-kit push --config drizzle.config.local.ts` | ❌ shell | ⬜ pending |
| BACK-04 | All 10 tables exist after migration | Integration (shell) | `wrangler d1 execute prompt-community-db --local --command "SELECT name FROM sqlite_master WHERE type='table'" --config src/workers/api/wrangler.toml` | ❌ shell | ⬜ pending |
| BACK-05 | Seed runs without error; rows present in `users` and `prompts` | Integration (shell) | `npm run seed && wrangler d1 execute prompt-community-db --local --command "SELECT COUNT(*) FROM prompts" --config src/workers/api/wrangler.toml` | ❌ | ⬜ pending |
| BACK-06 | Worker starts on `localhost:8787` with no cloud calls | Manual (start + curl) | `curl -s http://localhost:8787/health \| grep ok` | ❌ manual | ⬜ pending |
| DEV-01 | `.dev.vars.example` documents `ENV`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET` | Static (file inspection) | `grep -q JWT_SECRET .dev.vars.example && grep -q ENV .dev.vars.example && grep -q GITHUB_CLIENT_ID .dev.vars.example && grep -q GITHUB_CLIENT_SECRET .dev.vars.example` | ❌ W0 | ⬜ pending |
| DEV-02 | `.env.example` includes `VITE_API_URL` | Static (file inspection) | `grep -q VITE_API_URL .env.example` | ❌ W0 | ⬜ pending |
| DEV-03 | `CONTRIBUTING.md` contains two-terminal workflow docs (`npm run dev` + `wrangler dev`) | Static (file inspection) | `grep -q "wrangler dev" CONTRIBUTING.md && grep -q "npm run dev" CONTRIBUTING.md` | ❌ W0 | ⬜ pending |
| DEV-05 | `wrangler d1 execute --local` returns seeded rows; documented in `CONTRIBUTING.md` | Integration (shell) + Static | See BACK-05 command + `grep -q "wrangler d1 execute --local" CONTRIBUTING.md` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 must precede any task that depends on these artifacts. Planner MUST place these in Wave 0 (or an explicit prerequisite plan).

- [ ] Install `@cloudflare/vitest-pool-workers`: `npm install -D @cloudflare/vitest-pool-workers`
- [ ] `vitest.workers.config.ts` — Vitest pool-workers config scoped to `src/workers/api/**/*.spec.ts`
- [ ] `src/workers/api/index.spec.ts` — Boot test: health check returns 200; every registered route path returns a response (even 501); `env.DB` is defined (covers BACK-01, BACK-02, BACK-06)
- [ ] `.dev.vars.example` — Template file (committed; actual `.dev.vars` stays gitignored) — covers DEV-01
- [ ] `.env.example` updated with `VITE_API_URL=http://localhost:8787` — covers DEV-02
- [ ] `CONTRIBUTING.md` skeleton with the two-terminal workflow section — covers DEV-03, DEV-05
- [ ] `wrangler d1 create prompt-community-db` run once to obtain a real `database_id` UUID before filling in `src/workers/api/wrangler.toml`
- [ ] `tsconfig.worker.json` (or equivalent) so worker code type-checks against `@cloudflare/workers-types`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker boot via `wrangler dev` actually serves on `localhost:8787` | BACK-06 | `wrangler dev` is a long-running dev server; smoke-testable but not unit-testable in workerd pool | (1) Run `wrangler dev --config src/workers/api/wrangler.toml`. (2) `curl -s http://localhost:8787/health` returns `{"ok":true}`. (3) Stop server. |
| Two-terminal workflow end-to-end (fresh dev follow-through) | DEV-03 (Success Criteria #5) | Validates the docs are sufficient for a new developer | (1) On a clean checkout, follow `CONTRIBUTING.md` line-by-line. (2) Reach a state where both servers run and seeded data is queryable. (3) Confirm no step required outside knowledge. |
| `wrangler d1 execute --local` inspection works after seed | DEV-05 | Shell + local D1 file path; covered by automation but worth a one-time human spot-check | Run the documented command in `CONTRIBUTING.md`; rows visible. |

---

## Phase Gate Checklist (Success Criteria → Verification)

Each Roadmap success criterion gates `/gsd:verify-work`:

| Success Criterion | Verification |
|------------------|-------------|
| SC-1: `wrangler dev` starts API on `localhost:8787`, all routes registered, no cloud calls | `curl http://localhost:8787/health` returns `{"ok":true}`; every route in `src/workers/api/routes/*.ts` returns a response (even 501) — covered by `index.spec.ts` |
| SC-2: `drizzle-kit push` applies full schema to local D1 with no errors | `npx drizzle-kit push --config drizzle.config.local.ts` exits 0; `sqlite_master` contains all 10 table names + FTS5 virtual table |
| SC-3: `npm run seed` populates DB queryable via `wrangler d1 execute` | `wrangler d1 execute prompt-community-db --local --command "SELECT * FROM prompts" --config src/workers/api/wrangler.toml` returns ≥1 row |
| SC-4: `.dev.vars` template + `.env.example` present and complete | Both files exist and contain all required vars (per DEV-01, DEV-02 commands above) |
| SC-5: Two-terminal workflow documented; fresh dev can complete setup unaided | `CONTRIBUTING.md` contains: clone, install, `.dev.vars` setup, `.env.local` setup, `wrangler d1 create` (or pre-existing binding), `drizzle-kit push`, `npm run seed`, `npm run dev` + `wrangler dev`, inspection command |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (vitest pool-workers, boot spec, env templates, docs skeleton)
- [ ] No watch-mode flags (all commands are one-shot exit-coded)
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter once planner has wired Per-Task Verification Map IDs

**Approval:** pending
