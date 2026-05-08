---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Backend Migration
status: planning
stopped_at: Completed 12-write-api-04-PLAN.md
last_updated: "2026-05-08T16:19:41.153Z"
last_activity: 2026-05-05 — Roadmap created; 7 phases defined, 81/81 v2.0 requirements mapped
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 18
  completed_plans: 18
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05 — v2.0 Backend Migration started)

**Core value:** Any employee can find a proven AI prompt and use it immediately — no login, no friction, zero time between discovery and value.
**Current focus:** v2.0 Backend Migration — Phase 9: Backend Foundation (ready to plan)

## Current Position

Phase: 9 of 15 (Backend Foundation — v2.0 phase 1 of 7)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-05-05 — Roadmap created; 7 phases defined, 81/81 v2.0 requirements mapped

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v2.0)
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 09-backend-foundation P01 | 4min | 3 tasks | 9 files |
| Phase 09-backend-foundation P02 | 3min | 2 tasks | 15 files |
| Phase 09-backend-foundation P03 | 2min | 2 tasks | 3 files |
| Phase 09-backend-foundation P04 | 30min | 3 tasks | 3 files |
| Phase 10-auth-migration P01 | 7min | 3 tasks | 5 files |
| Phase 10-auth-migration P02 | 25 | 2 tasks | 12 files |
| Phase 10-auth-migration P03 | 4min | 2 tasks | 4 files |
| Phase 10-auth-migration P04 | 8min | 2 tasks | 4 files |
| Phase 11-read-api P01 | 10min | 2 tasks | 4 files |
| Phase 11-read-api P03 | 8min | 2 tasks | 1 files |
| Phase 11-read-api P02 | 525533min | 2 tasks | 5 files |
| Phase 11-read-api P04 | 8min | 2 tasks | 4 files |
| Phase 11-read-api P05 | 3min | 3 tasks | 5 files |
| Phase 12-write-api P01 | 2min | 2 tasks | 1 files |
| Phase 12-write-api P03 | 2min | 2 tasks | 1 files |
| Phase 12-write-api P02 | 3min | 2 tasks | 1 files |
| Phase 12-write-api P05 | 4min | 2 tasks | 3 files |
| Phase 12-write-api P04 | 8min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Full decision log in PROJECT.md Key Decisions table (updated 2026-05-05 — v2.0 added 5 architectural decisions).

Recent decisions affecting current work:
- App JWT in HttpOnly cookie (not localStorage) — XSS resistance; same-site CORS
- Drop ETag layer in v2.0 — TanStack Query staleTime + standard cache headers replace it
- Keep MiniSearch client-side alongside D1 FTS5 — offline PWA browsing is a hard requirement
- `/auth/dev-login` endpoint, env-gated — airplane-mode dev without GitHub round-trip
- [Phase 09-backend-foundation]: cloudflareTest plugin (not defineWorkersConfig): @cloudflare/vitest-pool-workers@0.15.2 ships cloudflareTest Vite plugin shape; defineWorkersConfig does not exist in this version
- [Phase 09-backend-foundation]: Placeholder wrangler.toml committed in Wave 0: vitest-pool-workers@0.15.x requires configPath to exist at pool init; Plan 02 overwrites with full config
- [Phase 09-backend-foundation]: D1 binding name prompt-community-db locked across all wrangler-invoking scripts (db:bootstrap, db:fts5, seed, dev:api)
- [Phase 09-backend-foundation]: D1 database_id kept as 'local' placeholder — wrangler d1 create requires auth; local D1 works; Plan 04 assigns real UUID for cloud
- [Phase 09-backend-foundation]: vitest.config.ts exclude added for src/workers/** to prevent jsdom suite picking up cloudflare:test imports
- [Phase 09-backend-foundation]: tsconfig.worker.json types extended with @cloudflare/vitest-pool-workers/types to resolve cloudflare:test for tsc
- [Phase 09-backend-foundation]: tsNow sql template reused for all timestamp defaults — DRY + identical ISO 8601ms SQLite semantics
- [Phase 09-backend-foundation]: moderation_log FKs have no onDelete:cascade — preserve audit trail even when prompt/user is removed
- [Phase 09-backend-foundation]: FTS5 NOT in schema.ts per RESEARCH Pitfall 1 — virtual table owned by Plan 04 raw SQL migration
- [Phase 09-backend-foundation]: FTS5 migration lives in 0002_fts5.sql as raw SQL outside drizzle-kit — virtual tables cannot be managed by drizzle-kit (RESEARCH Pitfall 1)
- [Phase 09-backend-foundation]: Seed uses hardcoded recognizable ID prefixes (01DEVUSER, 01PROMPT) not real ULIDs — raw SQL has no access to $defaultFn; prefixes aid DB inspection
- [Phase 09-backend-foundation]: FTS5 content-table mode with sync triggers chosen over full-copy mode — avoids data duplication, triggers maintain FTS index on INSERT/UPDATE/DELETE
- [Phase 09-backend-foundation]: INSERT OR IGNORE used throughout seed for idempotency — re-running seed is safe by design
- [Phase 10-auth-migration]: optionalAuth stub added to auth.ts before plan-02 implements — test import requires it
- [Phase 10-auth-migration]: Middleware tests use local Hono app, not full app import — isolates middleware behavior from route wiring
- [Phase 10-auth-migration]: Env type refactored to { Bindings, Variables } shape for type-safe c.set('user') in Hono middleware
- [Phase 10-auth-migration]: OAuth state validation only enforced when oauth_state cookie is present — allows test harness direct /callback access without full OAuth round-trip
- [Phase 10-auth-migration]: D1 test migration strategy: Node.js globalSetup reads SQL via readD1Migrations+provide(); worker setupFiles inject()+applyD1Migrations pattern established
- [Phase 10-auth-migration]: JwtTokenExpired from 'hono/utils/jwt/types' used for instanceof check to discriminate expired vs invalid tokens
- [Phase 10-auth-migration]: GET /me mounted at top-level app (not auth router) so URL is /me not /auth/me
- [Phase 10-auth-migration]: AuthCallbackView only calls window.close() — no fetch, no state, minimal popup concern
- [Phase 10-auth-migration]: logout() clears user.value only — POST /auth/logout deferred to Phase 13 (cookie has 7-day hard expiry)
- [Phase 10-auth-migration]: Poll-on-close popup pattern established: setInterval(200ms) checks popup.closed, calls fetchMe() on close — no postMessage
- [Phase 11-read-api]: notifications.spec.ts 401 test confirms /notifications is not yet mounted (returns 404 from Hono) — Phase 11 plan-N creates route and mounts it
- [Phase 11-read-api]: search.spec.ts uses 'bug' as seed-data probe word — appears in seeded prompt title, reliable FTS5 match
- [Phase 11-read-api]: TDD RED spec pattern: seeded IDs declared as named constants at top of each spec, pagination shape asserted on all list endpoints before implementation
- [Phase 11-read-api]: Activity feed derives from prompts table (status=published, author_id=user.id) not a separate activity_log table — keeps schema lean for v2.0
- [Phase 11-read-api]: inArray() from drizzle-orm used for multi-ID WHERE IN clause — column.in() is not a valid Drizzle API
- [Phase 11-read-api]: Seed SQL injection via vitest provide/inject for worker test environments requiring seeded D1 data
- [Phase 11-read-api]: trimTrailingSlash() middleware added to all Hono sub-apps — sub-app GET / does not match /prefix/ trailing slash requests
- [Phase 11-read-api]: inArray() batch queries + JS aggregation for reaction counts and tags in listing — avoids D1 GROUP BY subquery limitations
- [Phase 11-read-api]: Raw D1 prepare() used for FTS5 MATCH queries — Drizzle ORM cannot query FTS5 virtual tables
- [Phase 11-read-api]: GET /labels groups labels by prefix in JS — simple aggregation consistent with codebase patterns
- [Phase 11-read-api]: trimTrailingSlash added to all route files — fixes trailing slash 404s in boot test after stub replacement
- [Phase 11-read-api]: GET /labels extracted to labels.ts — was incorrectly nested under /search sub-app causing wrong URL path /search/labels
- [Phase 11-read-api]: SEARCH-01 updated: FTS5 indexes title+body only — tags fetched from prompt_tags via JS aggregation post-FTS5 (no FTS5 column needed)
- [Phase 12-write-api]: fakeUserToken minted with non-seeded FAKE_USER_ID for non-author/non-maintainer 403 tests in write.spec.ts
- [Phase 12-write-api]: Three-token JWT pattern established: author (jwtToken), maintainer (maintainerToken), non-author (fakeUserToken) — covers all auth tiers in write endpoint tests
- [Phase 12-write-api]: Route order enforced: POST /:id/versions registered before /:id/versions/:n/restore in Hono to prevent routing conflicts
- [Phase 12-write-api]: MAX(version_number)+1 via sql<number> aggregate for type-safe version auto-increment in Drizzle
- [Phase 12-write-api]: DELETE /prompts cascade preserves moderation_log — audit trail survives prompt deletion
- [Phase 12-write-api]: POST /prompts always creates with status=draft, ignoring body status — prevents direct published/flagged creation
- [Phase 12-write-api]: PATCH /prompts re-fetches prompt from DB after update for consistent response — avoids in-memory merge
- [Phase 12-write-api]: POST /bookmarks uses onConflictDoNothing() for idempotent insert — returns 201 whether new or pre-existing bookmark
- [Phase 12-write-api]: POST /notifications/:id/read uses combined WHERE id AND user_id — 404 for both unknown and other-user's notifications (no existence leakage)
- [Phase 12-write-api]: DrizzleQueryError wraps D1 errors — check both String(e) and String(e.cause) for UNIQUE/SQLITE_CONSTRAINT to detect 409 duplicate reactions
- [Phase 12-write-api]: fakeUserToken user seeded in seed.sql — FK constraint on reactions.user_id requires real DB row for reaction add+delete test round-trip
- [Phase 12-write-api]: DELETE /prompts/:id/reactions reads emoji from request body (not path param) — Hono supports c.req.json() for DELETE requests

### Roadmap Evolution

- 2026-05-05: Roadmap v2.0 created — 7 phases (9–15), 81/81 requirements mapped

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-05-08T16:19:41.151Z
Stopped at: Completed 12-write-api-04-PLAN.md
Resume file: None
