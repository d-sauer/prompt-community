---
phase: 09-backend-foundation
plan: "04"
subsystem: database
tags: [d1, sqlite, fts5, drizzle-kit, wrangler, seed]

# Dependency graph
requires:
  - phase: 09-backend-foundation/09-01
    provides: package.json scripts (db:bootstrap, db:fts5, db:setup, seed, db:push, dev:api)
  - phase: 09-backend-foundation/09-02
    provides: wrangler.toml with D1 binding + Hono worker scaffold
  - phase: 09-backend-foundation/09-03
    provides: schema.ts (10-table Drizzle schema) + drizzle.config.local.ts
provides:
  - FTS5 virtual table (prompts_fts) with sync triggers over prompts.title/body
  - Idempotent seed data — dev-user, dev-maintainer, 3 prompts, 7 labels
  - Complete CONTRIBUTING.md with two-terminal workflow + DB inspection commands
  - Working local D1 with all 10 tables + FTS5 queryable via wrangler d1 execute
affects:
  - 10-auth-migration (users table + dev fixture users ready)
  - 11-search (prompts_fts virtual table and FTS5 MATCH query pattern ready)
  - 12-prompt-writes (seed prompts + FK pattern established)
  - All future phases (CONTRIBUTING.md is the onboarding entrypoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FTS5 virtual table with content='prompts' content_rowid='rowid' managed via raw SQL (outside drizzle-kit)
    - INSERT OR IGNORE for idempotent seed data in FK-safe order (users → labels → prompts)
    - FTS5 sync triggers (prompts_ai, prompts_ad, prompts_au) for content-table mode
    - Hardcoded recognizable ID prefixes (01DEVUSER, 01PROMPT) in seed for DB inspection legibility

key-files:
  created:
    - src/workers/api/db/migrations/0002_fts5.sql
    - scripts/seed.sql
  modified:
    - CONTRIBUTING.md

key-decisions:
  - "FTS5 migration lives in 0002_fts5.sql as raw SQL — drizzle-kit cannot manage virtual tables (RESEARCH Pitfall 1)"
  - "Seed uses hardcoded recognizable ID prefixes not real ULIDs — raw SQL has no access to $defaultFn; prefixes aid inspection"
  - "INSERT OR IGNORE used throughout seed for idempotency — re-running seed is safe by design"
  - "FTS5 content-table mode chosen over full-copy mode — keeps text only in prompts table, triggers maintain index"
  - "SC-5 (fresh-developer follow-through) verified by user — cannot be automated by definition"

patterns-established:
  - "Pattern 1: Raw SQL migrations for SQLite features drizzle-kit cannot manage (virtual tables, custom triggers)"
  - "Pattern 2: Idempotent seeds via INSERT OR IGNORE on PK with FK-safe insert order"
  - "Pattern 3: FTS5 content-table mode with AFTER INSERT/UPDATE/DELETE triggers for index maintenance"

requirements-completed: [BACK-04, BACK-05, DEV-03, DEV-05]

# Metrics
duration: ~30min (split across two agent runs with checkpoint)
completed: 2026-05-05
---

# Phase 9 Plan 04: DB Bootstrap, FTS5 Virtual Table, Seed Data, and CONTRIBUTING.md Summary

**FTS5 virtual table over prompts with sync triggers, idempotent seed (2 users, 7 labels, 3 prompts), and complete CONTRIBUTING.md bringing the local dev environment to fully observable working state**

## Performance

- **Duration:** ~30 min (two agent runs: tasks 1-2, then checkpoint continuation for task 3)
- **Started:** 2026-05-05
- **Completed:** 2026-05-05T14:56:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments

- Created `0002_fts5.sql` — hand-written raw SQL for the FTS5 virtual table (content='prompts') plus three sync triggers (INSERT/UPDATE/DELETE); FTS5 MATCH search verified working against seeded data
- Created `scripts/seed.sql` — idempotent INSERT OR IGNORE seed in FK-safe order (users → labels → prompts → prompt_tags); 2 users, 7 labels, 3 prompts confirmed in D1
- Finalized `CONTRIBUTING.md` — replaced both `PLAN-04` marker blocks with the complete one-time setup sequence (db:setup, seed) and the DB inspection command reference; SC-5 verified by user

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FTS5 migration and seed SQL files** - `a11bab7` (feat)
   - Includes two auto-fixes: drizzle.config.local.ts path correction + better-sqlite3 devDependency
2. **Task 2: Finalize CONTRIBUTING.md** - `e0227d2` (docs)
3. **Task 3: Manual checkpoint SC-5** - no commit (checkpoint task; user verified)

**Plan metadata:** (this docs commit — see PLAN COMPLETE message)

## Files Created/Modified

- `src/workers/api/db/migrations/0002_fts5.sql` - FTS5 virtual table over prompts.title/body with content='prompts', content_rowid='rowid', plus three sync triggers (prompts_ai, prompts_ad, prompts_au)
- `scripts/seed.sql` - Idempotent seed: dev-user, dev-maintainer, 7 labels (category/model/difficulty taxonomy), 3 sample prompts, 6 prompt_tags
- `CONTRIBUTING.md` - Replaced PLAN-04 markers with full one-time D1 setup steps (db:setup, seed) and DB inspection section

## Decisions Made

- **FTS5 as raw SQL outside drizzle-kit:** drizzle-kit cannot introspect or manage virtual tables (RESEARCH Pitfall 1). The migration file is named `0002_fts5.sql` so it sorts after drizzle-kit's generated schema migration; drizzle-kit ignores files it didn't generate.
- **Content-table mode with triggers:** FTS5 `content='prompts'` keeps text storage only in the prompts table. Requires explicit sync triggers. This was chosen over full-copy mode because it avoids data duplication and Phase 11 search queries will JOIN back to prompts for the full row anyway.
- **Hardcoded recognizable ID prefixes in seed:** Raw SQL has no access to the `$defaultFn(() => ulid())` call path. Prefixes like `01DEVUSER000000000000000001` (27 chars, fits TEXT PK) are intentionally recognizable for easy DB inspection — not real ULIDs but functionally equivalent for dev purposes.
- **SC-5 as human checkpoint:** Fresh-developer verification cannot be automated. User approved the checkpoint, confirming CONTRIBUTING.md is sufficient for unaided setup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong D1 SQLite path in drizzle.config.local.ts**
- **Found during:** Task 1 (pre-flight db:push run)
- **Issue:** `drizzle.config.local.ts` was pointing at `.wrangler/state/v3/d1/...` at the repo root, but wrangler stores local D1 state at `src/workers/api/.wrangler/state/v3/d1/...` (relative to the wrangler.toml's directory)
- **Fix:** Corrected the `dbCredentials.url` path to `src/workers/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`; also added `tablesFilter: ["!*_fts*"]` to skip FTS5 shadow tables from drizzle-kit introspection
- **Files modified:** `drizzle.config.local.ts`
- **Verification:** `npm run db:push` applied the full schema with no errors after fix
- **Committed in:** `a11bab7` (Task 1 commit)

**2. [Rule 3 - Blocking] Added better-sqlite3 devDependency**
- **Found during:** Task 1 (first db:push attempt)
- **Issue:** `drizzle-kit push` for SQLite requires `better-sqlite3` at runtime but it was not in devDependencies; import failed with module-not-found error
- **Fix:** `npm install --save-dev better-sqlite3 @types/better-sqlite3`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run db:push` succeeded after install
- **Committed in:** `a11bab7` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocker)
**Impact on plan:** Both auto-fixes were necessary for the setup chain to execute at all. No scope creep; `package.json` scripts themselves were NOT modified (Wave 0 ownership respected).

## Verification Gate Outputs

All plan-level verification criteria confirmed on 2026-05-05:

**Tables in sqlite_master:**
```
_cf_METADATA, bookmarks, comments, labels, moderation_log, notifications,
prompt_tags, prompt_versions, prompts, prompts_fts (+ shadow tables:
prompts_fts_config, prompts_fts_data, prompts_fts_docsize, prompts_fts_idx),
reactions, users
```
All 10 domain tables + prompts_fts virtual table present. ✓

**Seed counts:**
- `SELECT COUNT(*) FROM prompts` → 3 ✓
- `SELECT COUNT(*) FROM users` → 2 ✓
- `SELECT COUNT(*) FROM labels` → 7 ✓

**FTS5 search test:**
```
SELECT title FROM prompts_fts WHERE prompts_fts MATCH 'bug'
→ "Write a clear bug report"
```
FTS5 search returning correct results. ✓

**Test suites — zero regressions:**
- `npm test` → 135 passed, 16 todo, 5 skipped (24 test files)
- `npm run test:workers` → 9 passed (1 test file)

**SC-5 (fresh-developer follow-through):** Verified by user via checkpoint approval. User confirmed CONTRIBUTING.md is sufficient for unaided local setup.

**package.json not modified by this plan:** Wave 0 (Plan 09-01) owns all npm scripts. This plan only created the SQL files those scripts target.

## Drizzle-kit Generated Migration

The drizzle-kit generated migration under `src/workers/api/db/migrations/` is named according to drizzle-kit's internal versioning. The FTS5 migration `0002_fts5.sql` is manually named to sort after it. Co-locating is safe — drizzle-kit only manages files it generated.

## Issues Encountered

- `npm run db:push` fails with "index already exists" if run on a DB that already has the schema applied. This is expected behavior (drizzle-kit push is not idempotent against existing indexes). `npm run db:bootstrap` + fresh state resolves it; for daily use `db:push` will be a no-op once schema is stable. Documented in CONTRIBUTING.md reset instructions.

## User Setup Required

None — no external service configuration required for this plan. The wrangler D1 create step (for production database_id) is optional for local dev and documented as such in CONTRIBUTING.md.

## Next Phase Readiness

Phase 10 (Auth Migration) can begin immediately:
- `users` table with `github_id`, `github_login`, `name`, `role` columns ready
- `dev-user` (role=user) and `dev-maintainer` (role=maintainer) seed fixtures present
- `JWT_SECRET` env var template established in Plan 09-01
- Worker scaffold with `/health` endpoint running
- FTS5 prompts_fts index ready for Phase 11 search queries

---
*Phase: 09-backend-foundation*
*Completed: 2026-05-05*
