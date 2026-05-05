---
phase: 09-backend-foundation
plan: "01"
subsystem: infra
tags: [hono, drizzle-orm, drizzle-kit, ulid, cloudflare-workers, d1, vitest-pool-workers, wrangler]

# Dependency graph
requires: []
provides:
  - All Phase 9 npm dependencies installed (hono, drizzle-orm, ulid, @cloudflare/vitest-pool-workers, drizzle-kit, @cloudflare/workers-types)
  - All 8 Phase 9 npm scripts registered in package.json
  - vitest-pool-workers test harness configured (vitest.workers.config.ts)
  - Boot spec placeholder with it.todo stubs (src/workers/api/index.spec.ts)
  - Placeholder wrangler.toml for Plan 02 to fill (src/workers/api/wrangler.toml)
  - Worker TypeScript config (tsconfig.worker.json)
  - Env-var templates (.dev.vars.example, .env.example updated)
  - CONTRIBUTING.md skeleton with two-terminal workflow + PLAN-04 markers
affects: [09-02, 09-03, 09-04, all Phase 9 plans]

# Tech tracking
tech-stack:
  added:
    - hono@4.12.17
    - drizzle-orm@0.45.2
    - ulid@3.0.2
    - "@cloudflare/vitest-pool-workers@0.15.2"
    - drizzle-kit@0.31.10
    - "@cloudflare/workers-types@4.20260505.1"
  patterns:
    - Separate vitest config per runtime (vitest.config.ts for jsdom, vitest.workers.config.ts for workerd)
    - it.todo placeholders for cross-plan test stubs (Wave 0 commits green, Wave 1 turns real)
    - *.example committed, actual secrets gitignored

key-files:
  created:
    - vitest.workers.config.ts
    - src/workers/api/index.spec.ts
    - src/workers/api/wrangler.toml
    - tsconfig.worker.json
    - .dev.vars.example
    - CONTRIBUTING.md
  modified:
    - package.json
    - .env.example
    - .gitignore

key-decisions:
  - "Used cloudflareTest plugin shape (v0.15.x) not defineWorkersConfig — the installed @cloudflare/vitest-pool-workers@0.15.2 exports cloudflareTest, not defineWorkersConfig"
  - "Created placeholder wrangler.toml in Wave 0 — vitest-pool-workers@0.15.x requires configPath to exist at startup, unlike older versions; Plan 02 overwrites with full config"
  - "D1 binding name prompt-community-db locked across all four wrangler-invoking scripts (db:bootstrap, db:fts5, seed, dev:api via wrangler.toml)"

patterns-established:
  - "Separate vitest config per runtime: vitest.config.ts (jsdom Vue tests) vs vitest.workers.config.ts (workerd API tests)"
  - "Wave 0 cross-plan handoff: it.todo stubs mark where Wave 1 fills in real assertions"
  - "PLAN-XX comment markers in docs scaffold for future plans to extend"

requirements-completed: [DEV-01, DEV-02, DEV-03]

# Metrics
duration: 4min
completed: "2026-05-05"
---

# Phase 9 Plan 01: Wave 0 Scaffolding Summary

**Hono + Drizzle + vitest-pool-workers installed; all 8 Phase 9 scripts registered; boot spec placeholder and worker tsconfig committed; env templates and CONTRIBUTING.md skeleton ready for Wave 1 and Plan 04**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T11:30:31Z
- **Completed:** 2026-05-05T11:34:24Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Installed all 6 Phase 9 deps in one shot — Wave 1 plans (09-02, 09-03) can now treat package.json as read-only and work in parallel on disjoint file sets
- Established vitest-pool-workers test harness with 3 it.todo boot spec placeholders; `npm run test:workers` exits 0 immediately
- Created env-var templates and CONTRIBUTING.md skeleton satisfying DEV-01, DEV-02, DEV-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deps, scripts, test harness** - `965c256` (feat)
2. **Task 2: Env-var templates and .gitignore** - `f136ab4` (chore)
3. **Task 3: CONTRIBUTING.md skeleton** - `53f3d8e` (docs)

## Files Created/Modified

- `package.json` — added 8 Phase 9 npm scripts; hono/drizzle-orm/ulid in dependencies; vitest-pool-workers/drizzle-kit/workers-types in devDependencies
- `vitest.workers.config.ts` — cloudflareTest plugin config scoped to src/workers/api/**/*.spec.ts
- `src/workers/api/index.spec.ts` — boot test with 3 it.todo placeholders (Wave 1 turns real)
- `src/workers/api/wrangler.toml` — placeholder with minimal D1 binding; Plan 02 overwrites
- `tsconfig.worker.json` — worker TS config using @cloudflare/workers-types, scoped to src/workers/api/**
- `.dev.vars.example` — four required vars: ENV, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET
- `.env.example` — appended VITE_API_URL=http://localhost:8787; all v1 vars retained (DECOM-08 is Phase 15)
- `.gitignore` — added .dev.vars and .wrangler/ entries
- `CONTRIBUTING.md` — skeleton with two-terminal workflow; PLAN-04 markers at lines 32 and 52

## Decisions Made

**1. cloudflareTest plugin vs defineWorkersConfig**
`@cloudflare/vitest-pool-workers@0.15.2` exports `cloudflareTest` (Vite plugin shape), not `defineWorkersConfig`. The plan mentioned both; `cloudflareTest` is what ships in v0.15.x. Used `cloudflareTest` from `@cloudflare/vitest-pool-workers` + `defineConfig` from `vitest/config`.

**2. Placeholder wrangler.toml committed in Wave 0**
vitest-pool-workers@0.15.x requires the `configPath` file to exist at pool initialization time — unlike older versions that were more lenient. Created a minimal placeholder (name, main, compatibility_date, D1 binding) so `npm run test:workers` exits 0 immediately. Plan 02 will overwrite this file with the full configuration.

**3. D1 binding name prompt-community-db locked**
All four wrangler-invoking scripts (`db:bootstrap`, `db:fts5`, `seed`, plus `dev:api` which invokes wrangler with the toml) use `prompt-community-db` as the D1 binding name. Placeholder wrangler.toml also uses this name. If Plan 02 changes it, all references must update in lockstep.

## Installed Versions (final)

| Package | Version | Type |
|---------|---------|------|
| hono | 4.12.17 | dependency |
| drizzle-orm | 0.45.2 | dependency |
| ulid | 3.0.2 | dependency |
| @cloudflare/vitest-pool-workers | 0.15.2 | devDependency |
| drizzle-kit | 0.31.10 | devDependency |
| @cloudflare/workers-types | 4.20260505.1 | devDependency |

## All 8 Phase 9 Scripts (verbatim from package.json)

```json
"test:workers": "vitest run --config vitest.workers.config.ts",
"dev:api": "wrangler dev --config src/workers/api/wrangler.toml",
"db:push": "drizzle-kit push --config drizzle.config.local.ts",
"db:generate": "drizzle-kit generate --config drizzle.config.ts",
"db:bootstrap": "wrangler d1 execute prompt-community-db --local --command \"SELECT 1\" --config src/workers/api/wrangler.toml",
"db:fts5": "wrangler d1 execute prompt-community-db --local --file=src/workers/api/db/migrations/0002_fts5.sql --config src/workers/api/wrangler.toml",
"db:setup": "npm run db:bootstrap && npm run db:push && npm run db:fts5",
"seed": "wrangler d1 execute prompt-community-db --local --file=scripts/seed.sql --config src/workers/api/wrangler.toml"
```

## .dev.vars.example Final Content

```
# .dev.vars.example — copy to .dev.vars (gitignored) for local wrangler dev.
# Loaded automatically by `wrangler dev` for the API worker.
ENV=dev
GITHUB_CLIENT_ID=Iv1.localdev...
GITHUB_CLIENT_SECRET=xxx
JWT_SECRET=any-random-string-for-dev
```

## .env.example Final Content (relevant addition)

Added to end of existing file (v1 vars unchanged):
```
# v2 API base URL (Hono worker on localhost in dev; deployed CF worker URL in prod)
VITE_API_URL=http://localhost:8787
```

## CONTRIBUTING.md PLAN-04 Marker Locations

- **Line 32:** `<!-- PLAN-04: insert wrangler d1 create, drizzle-kit push, FTS5 migration, npm run seed steps -->` (inside "One-time setup" step 3)
- **Line 52:** `<!-- PLAN-04: document the wrangler d1 execute --local command + sample queries -->` (inside "Inspecting the local D1 database" section)

## D1 Binding Name Confirmation

`prompt-community-db` is locked in across all four wrangler-invoking scripts:
- `db:bootstrap` — `wrangler d1 execute prompt-community-db --local ...`
- `db:fts5` — `wrangler d1 execute prompt-community-db --local ...`
- `seed` — `wrangler d1 execute prompt-community-db --local ...`
- `dev:api` — invokes `wrangler dev --config src/workers/api/wrangler.toml` (wrangler.toml uses `database_name = "prompt-community-db"`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created placeholder wrangler.toml in Wave 0**
- **Found during:** Task 1 (workers test harness)
- **Issue:** `@cloudflare/vitest-pool-workers@0.15.2` requires `configPath` to exist at pool init time. Without a `wrangler.toml`, `npm run test:workers` fails with `ParseError: Could not read file`. The plan intended this file to come from Plan 02 but didn't account for the pool-workers requirement.
- **Fix:** Created `src/workers/api/wrangler.toml` with minimal content (name, main, compatibility_date, D1 binding) so tests can initialize. Plan 02 will overwrite with the full configuration.
- **Files modified:** `src/workers/api/wrangler.toml`
- **Verification:** `npm run test:workers` exits 0 with 3 todos after fix
- **Committed in:** `965c256` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for Task 1 completion. Plan 02 owns wrangler.toml content; placeholder ensures Wave 1 can run tests immediately without needing to bootstrap first.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None — no external service configuration required for Wave 0.

## Next Phase Readiness

- Wave 1 (Plans 09-02 and 09-03) can run in parallel: package.json is read-only, file sets are disjoint
- Plan 09-02 must overwrite `src/workers/api/wrangler.toml` with the full Hono worker config
- Plan 09-03 can create drizzle.config.ts and drizzle.config.local.ts (db:generate/db:push scripts ready)
- Plan 09-04 can fill in CONTRIBUTING.md at the PLAN-04 markers (lines 32 and 52)
- Boot spec todos at `src/workers/api/index.spec.ts` turn real once Plan 02 creates `src/workers/api/index.ts`

---
*Phase: 09-backend-foundation*
*Completed: 2026-05-05*
