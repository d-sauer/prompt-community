---
phase: 09-backend-foundation
plan: "02"
subsystem: api
tags: [hono, cloudflare-workers, d1, wrangler, vitest-pool-workers, cors, middleware]

# Dependency graph
requires:
  - 09-01 (hono installed, vitest.workers.config.ts, placeholder wrangler.toml)
provides:
  - Boot-able Hono API worker with 7 route stubs and D1 binding wired
  - src/workers/api/index.ts with Env type exported
  - src/workers/api/wrangler.toml full config
  - src/workers/api/worker-configuration.d.ts (generated types)
  - src/workers/api/routes/{auth,prompts,comments,reactions,users,search,admin}.ts (501 stubs)
  - src/workers/api/middleware/{auth,role}.ts (pass-through skeletons)
  - Boot spec green: 9/9 tests pass under workerd
affects:
  - 09-03 (disjoint files — no overlap)
  - 09-04 (wrangler.toml now full; CONTRIBUTING.md markers ready)
  - Phase 10 (fills in routes/auth.ts + middleware/auth.ts with real JWT)
  - Phase 11/12/14 (fill in remaining route handlers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Hono sub-app composition: each route module is a Hono<{ Bindings: Env }> instance, mounted via app.route()
    - CORS with credentials:true (required for Phase 10 HttpOnly cookie sessions)
    - Per-request drizzle(c.env.DB) pattern documented in code (not yet used in stubs)
    - wrangler types generates worker-configuration.d.ts from wrangler.toml

key-files:
  created:
    - src/workers/api/index.ts
    - src/workers/api/wrangler.toml
    - src/workers/api/worker-configuration.d.ts
    - src/workers/api/routes/auth.ts
    - src/workers/api/routes/prompts.ts
    - src/workers/api/routes/comments.ts
    - src/workers/api/routes/reactions.ts
    - src/workers/api/routes/users.ts
    - src/workers/api/routes/search.ts
    - src/workers/api/routes/admin.ts
    - src/workers/api/middleware/auth.ts
    - src/workers/api/middleware/role.ts
  modified:
    - src/workers/api/index.spec.ts (it.todo -> real assertions)
    - vitest.config.ts (exclude src/workers/** from jsdom suite)
    - tsconfig.worker.json (added @cloudflare/vitest-pool-workers/types)

key-decisions:
  - "D1 database_id kept as 'local' placeholder — wrangler d1 create requires Cloudflare auth; local D1 works with 'local' as id for dev; Plan 04 can assign real UUID if cloud deployment is needed"
  - "vitest.config.ts exclude added — jsdom suite picked up index.spec.ts after cloudflare:test imports were added; fixed by adding src/workers/** to exclude list alongside node_modules"
  - "tsconfig.worker.json types extended — added @cloudflare/vitest-pool-workers/types to resolve cloudflare:test module for tsc; tsc -p tsconfig.worker.json --noEmit now exits 0"
  - "package.json NOT modified — all deps and scripts inherited from Plan 09-01 (Wave 0 disjoint-files invariant honored)"

# Metrics
duration: 3min
completed: "2026-05-05"
---

# Phase 9 Plan 02: Hono API Worker Scaffold Summary

**Hono entry point with 7 route stubs, D1 binding, CORS, and middleware skeletons; boot spec turns 9/9 green under workerd; tsc and both test suites exit 0**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-05T11:36:56Z
- **Completed:** 2026-05-05T11:40:27Z
- **Tasks:** 2
- **Files created:** 12 (index.ts, wrangler.toml, worker-configuration.d.ts, 7 routes, 2 middleware)
- **Files modified:** 3 (index.spec.ts, vitest.config.ts, tsconfig.worker.json)

## Accomplishments

- Created the load-bearing `src/workers/api/index.ts`: CORS configured with `credentials: true`, `/health` route, all 7 route prefixes mounted via `app.route()`
- Wrote 9 near-identical route/middleware stubs following the plan's Pattern 1; all compile cleanly
- Wrote full `src/workers/api/wrangler.toml` with D1 binding (DB), vars (ENV, APP_ORIGIN), `compatibility_date = "2025-01-01"`
- Generated `src/workers/api/worker-configuration.d.ts` via `wrangler types` — contains `DB: D1Database`, `ENV`, `APP_ORIGIN`
- Replaced 3 `it.todo` stubs with real `it.each` + inline assertions; `npm run test:workers` now reports 9/9 green
- Fixed jsdom / workerd test isolation so `npm test` and `npm run test:workers` both exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Hono app entry, routes, middleware, wrangler config** - `47c7b3b` (feat)
2. **Task 2: Generate worker types + turn boot spec green** - `9d7aa85` (feat)
3. **Task 2 auto-fix: tsconfig.worker.json types fix** - `1c87221` (fix)

## D1 database_id Decision

`database_id = "local"` was kept as the placeholder value. `wrangler d1 create` requires Cloudflare authentication and would not work offline. For local development, wrangler accepts `"local"` and stores data under `.wrangler/state/v3/d1/`. A real UUID is only needed when deploying to Cloudflare — Plan 09-04 is the appropriate place to document the `wrangler d1 create` step in CONTRIBUTING.md.

## Route Module File List

| File | Resource | Phase that fills in handlers |
|------|----------|------------------------------|
| `src/workers/api/routes/auth.ts` | GitHub OAuth + JWT + session | Phase 10 |
| `src/workers/api/routes/prompts.ts` | CRUD for prompts | Phase 11 |
| `src/workers/api/routes/comments.ts` | CRUD for comments | Phase 11/12 |
| `src/workers/api/routes/reactions.ts` | Like / reaction endpoints | Phase 12 |
| `src/workers/api/routes/users.ts` | User profile endpoints | Phase 11/12 |
| `src/workers/api/routes/search.ts` | FTS5 search proxy | Phase 11 |
| `src/workers/api/routes/admin.ts` | Maintainer-only admin actions | Phase 14 |

All routes use `app.all('*', ...)` catch-all returning `{ message: 'Not implemented', resource: '<name>' }` with status 501.

## Env Interface (from worker-configuration.d.ts)

```typescript
interface Cloudflare.Env {
  DB: D1Database;      // D1 binding — use drizzle(c.env.DB) per request
  ENV: "dev";          // runtime environment tag; Phase 10 checks this
  APP_ORIGIN: "http://localhost:5173";  // CORS allowed origin
}
```

Phase 10 will extend the `Env` type in `index.ts` with `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `JWT_SECRET` (already typed as optional in the exported `Env` type).

## Verification Results

- `npx tsc -p tsconfig.worker.json --noEmit` — exits 0 (after adding `@cloudflare/vitest-pool-workers/types`)
- `npm run test:workers` — 9/9 tests green (1 health + 7 route prefix it.each + 1 env.DB)
- `npm test` — 24 test files pass, 0 fail (jsdom suite; worker specs excluded)
- `git diff HEAD -- package.json` — empty (package.json NOT modified by this plan)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added exclude to vitest.config.ts**
- **Found during:** Task 2 (overall verification)
- **Issue:** After replacing `it.todo` stubs with real `it.each` + `cloudflare:test` imports in `index.spec.ts`, the jsdom vitest config picked up the spec file and failed with `Failed to resolve import "cloudflare:test"`. The jsdom config had no `include`/`exclude` pattern to separate workerd specs.
- **Fix:** Added `exclude: ['node_modules/**', '**/dist/**', 'src/workers/**']` to `vitest.config.ts`. Retaining the standard exclusions was required — omitting `node_modules/**` caused vitest to scan node_modules and run 25 third-party test files.
- **Files modified:** `vitest.config.ts`
- **Commit:** `9d7aa85`

**2. [Rule 2 - Missing Critical Functionality] Added vitest-pool-workers types to tsconfig.worker.json**
- **Found during:** Task 2 overall verification (`npx tsc -p tsconfig.worker.json --noEmit`)
- **Issue:** `tsc` could not resolve `cloudflare:test` module from `index.spec.ts`. The `tsconfig.worker.json` only listed `@cloudflare/workers-types` which does not include test helpers.
- **Fix:** Added `"@cloudflare/vitest-pool-workers/types"` to the `types` array. This package ships `types/cloudflare-test.d.ts` containing the `declare module "cloudflare:test"` declaration.
- **Files modified:** `tsconfig.worker.json`
- **Commit:** `1c87221`

### Wave 1 Disjoint-files Invariant

No overlap with Plan 09-03 file set (`src/workers/api/db/schema.ts`, `drizzle.config.local.ts`, `drizzle.config.ts`) — invariant preserved.

## Next Phase Readiness

- **Plan 09-03 (Wave 1 parallel):** Unblocked — touches entirely different files (drizzle schema + config)
- **Plan 09-04 (Wave 2):** Can now target `src/workers/api/wrangler.toml` for migration commands; CONTRIBUTING.md PLAN-04 markers at lines 32 and 52 ready
- **Phase 10:** `src/workers/api/routes/auth.ts` and `src/workers/api/middleware/auth.ts` stubs are importable; `Env` type exported from `index.ts` is the extension point
- **Wave 2 seed/migrate:** wrangler.toml exists with `[[d1_databases]]` block — `npm run db:bootstrap` can now succeed

## Self-Check: PASSED

All 12 created files exist on disk. All 3 commits (47c7b3b, 9d7aa85, 1c87221) confirmed in git log.

---
*Phase: 09-backend-foundation*
*Completed: 2026-05-05*
