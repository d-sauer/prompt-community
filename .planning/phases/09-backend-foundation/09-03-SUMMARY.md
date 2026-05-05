---
phase: 09-backend-foundation
plan: "03"
subsystem: database
tags: [drizzle-orm, drizzle-kit, d1, sqlite, ulid, schema, migrations]

# Dependency graph
requires:
  - phase: 09-01
    provides: drizzle-orm@0.45.2, drizzle-kit@0.31.10, ulid@3.0.2 installed; db:push and db:generate scripts registered
provides:
  - Full Drizzle ORM schema for all 10 v2.0 tables (src/workers/api/db/schema.ts)
  - drizzle.config.local.ts — sqlite driver with findLocalD1() helper for db:push dev workflow
  - drizzle.config.ts — d1-http driver for production CI migrations
affects: [09-04, 11-read-endpoints, 12-write-endpoints, 14-admin-api, 15-production-deploy]

# Tech tracking
tech-stack:
  added: []  # All deps came from Plan 09-01; this plan adds no new packages
  patterns:
    - Single tsNow constant (sql template) reused across all timestamp defaults for DRY semantics
    - TEXT ULID PKs with $defaultFn(() => ulid()) — IDs generated in worker before INSERT
    - onDelete:cascade only on parent-owns-children FKs; no cascade on audit tables (moderation_log)
    - findLocalD1() inline helper in drizzle.config.local.ts — zero extra deps, resolves .wrangler SQLite path

key-files:
  created:
    - src/workers/api/db/schema.ts
    - drizzle.config.local.ts
    - drizzle.config.ts

key-decisions:
  - "tsNow sql template reused for all timestamp defaults — DRY + identical ISO 8601ms SQLite semantics"
  - "moderation_log FKs have no onDelete:cascade — preserve audit trail even when prompt/user is removed"
  - "?? '' fallback in drizzle.config.ts dbCredentials — prevents drizzle-kit crashing in dev when CLOUDFLARE_* vars absent"
  - "FTS5 NOT in schema.ts per Pitfall 1 — virtual table owned by Plan 04 raw SQL migration"

patterns-established:
  - "Schema-as-contract: all 10 tables typed and indexed here; Phases 11/12/14 import and get full type inference"
  - "Two-config-file drizzle-kit pattern: local sqlite path (drizzle.config.local.ts) vs remote d1-http (drizzle.config.ts)"

requirements-completed: [BACK-03]

# Metrics
duration: 2min
completed: "2026-05-05"
---

# Phase 9 Plan 03: Drizzle Schema + Config Summary

**10-table Drizzle ORM schema (TEXT ULID PKs, CHECK constraints, composite PKs, cascaded FKs, read-path indexes) with two drizzle-kit configs (local sqlite + remote d1-http) — no FTS5**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-05T11:53:47Z
- **Completed:** 2026-05-05T11:55:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Wrote the full 10-table schema that all downstream phases (11/12/14) will import for type-safe Drizzle queries
- Established correct cascade semantics: prompts delete tags/versions/comments/reactions; users delete reactions/bookmarks/notifications; moderation_log preserves history without cascade
- Wired two drizzle-kit configs enabling both `npm run db:push` (local dev) and `npm run db:generate` (prod CI) with zero new dependencies beyond what Plan 09-01 installed

## Task Commits

Each task was committed atomically:

1. **Task 1: Write full 10-table Drizzle schema** - `75774c0` (feat)
2. **Task 2: Create drizzle-kit configs (local SQLite + remote d1-http)** - `aaa9c8c` (chore)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/workers/api/db/schema.ts` — Full Drizzle ORM schema: 10 tables, TEXT ULID PKs, composite PKs, CHECK constraints, read-path indexes. No FTS5.
- `drizzle.config.local.ts` — drizzle-kit config for local dev; findLocalD1() helper resolves .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite; throws helpful error if db:bootstrap not yet run
- `drizzle.config.ts` — drizzle-kit config for production CI; d1-http driver; CLOUDFLARE_* env vars with ?? '' fallback

## Decisions Made

**1. tsNow sql template constant (DRY timestamp default)**
All 10 tables use `const tsNow = sql\`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))\`` rather than inline SQL strings. This avoids potential drift between tables if the format ever changes and is semantically identical.

**2. moderation_log FKs — no cascade**
`moderation_log.prompt_id` and `moderation_log.actor_id` intentionally have no `onDelete: 'cascade'`. Audit records must survive even when the underlying prompt or actor is removed. Phase 12 will define the soft-delete rule for users.

**3. drizzle.config.ts uses `?? ''` not `!` for env vars**
The plan's Pattern 3 used `!` (non-null assertion). Changed to `?? ''` to prevent drizzle-kit from crashing during local dev when CLOUDFLARE_* vars aren't set. The fallback empty strings simply mean the remote config doesn't work locally — which is correct behavior.

**4. FTS5 NOT in schema.ts**
Per RESEARCH.md Pitfall 1 and the plan's explicit note: no FTS5 virtual table in schema.ts. Drizzle-kit push cannot manage virtual tables. FTS5 lives in Plan 04's raw SQL migration (`src/workers/api/db/migrations/0002_fts5.sql`).

## Installed Versions (confirmed from Plan 09-01 SUMMARY.md)

| Package | Version | Used by |
|---------|---------|---------|
| drizzle-orm | 0.45.2 | schema.ts imports |
| drizzle-kit | 0.31.10 | drizzle.config.*.ts CLI |
| ulid | 3.0.2 | $defaultFn(() => ulid()) |

All three worked without issue — no version conflicts, no install required.

## Type-Inferred Shapes (for Phase 11 reference)

```typescript
// users.$inferSelect — read shape returned by db.select().from(users)
type UserSelect = {
  id: string
  github_id: number
  github_login: string
  name: string | null
  avatar_url: string | null
  role: 'user' | 'maintainer'
  created_at: string
}

// prompts.$inferSelect — read shape
type PromptSelect = {
  id: string
  author_id: string
  title: string
  body: string
  category: string | null
  model: string | null
  difficulty: string | null
  status: 'published' | 'flagged' | 'hidden' | 'draft'
  created_at: string
  updated_at: string
}
```

Phase 11 and 12 get these shapes for free via `db.select().from(schema.users)` — no manual type annotations needed.

## FTS5 Exclusion Confirmation

FTS5 virtual table (`prompts_fts`) is explicitly NOT in `src/workers/api/db/schema.ts`. The schema file contains exactly 10 regular tables. Plan 04 owns the raw SQL migration at `src/workers/api/db/migrations/0002_fts5.sql`.

## package.json Confirmation

`package.json` was NOT modified by this plan. Verified via `git diff HEAD package.json` — clean. All dependencies (`drizzle-orm`, `ulid`, `drizzle-kit`) were installed by Plan 09-01 and inherited here. The `db:push` and `db:generate` scripts registered by Plan 09-01 now resolve to the configs created in this plan.

## Deviations from Plan

None - plan executed exactly as written.

The only minor difference from Pattern 3 verbatim: `?? ''` used instead of `!` for CLOUDFLARE_* env vars in drizzle.config.ts. This is a correctness improvement (avoids crashing on missing vars in dev) and does not change the contract for prod CI.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. Plan 04 documents the one-time `npm run db:bootstrap` command before `db:push` can be used.

## Next Phase Readiness

- **Plan 09-04** can fill in CONTRIBUTING.md PLAN-04 markers with the db:bootstrap + db:push + FTS5 migration steps
- **Plan 09-04** creates the raw SQL FTS5 migration at `src/workers/api/db/migrations/0002_fts5.sql`
- **Phase 11** can import any of the 10 exported tables: `import { users, prompts, ... } from '@/workers/api/db/schema'`
- **Phase 12** can use `$inferInsert` types for write operations
- `npm run db:push` is ready to use as soon as `npm run db:bootstrap` has been run once

---
*Phase: 09-backend-foundation*
*Completed: 2026-05-05*
