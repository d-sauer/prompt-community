# Phase 9: Backend Foundation - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** PRD Express Path (`design/change-request-v2.md`)

<domain>
## Phase Boundary

This phase delivers the **local-runnable Hono API worker** with a fully migrated D1 schema and a seeded local database. It is the foundation every subsequent v2 phase builds on.

**In scope (Phase 9):**
- Scaffold the Hono API worker under `src/workers/api/` with route module skeletons per resource (no business logic yet — endpoints can be stubs that return 501).
- Configure Cloudflare D1 binding in `wrangler.toml` for both local and production environments.
- Define the full Drizzle ORM schema for all v2 tables.
- Set up `drizzle-kit` migrations runnable against local D1.
- Provide an `npm run seed` script that populates local D1 with dev users + sample prompts.
- Create `.dev.vars` template and `.env.example` documenting every required env var.
- Document the two-terminal dev workflow (`npm run dev` + `wrangler dev`).
- Verify the worker starts via `wrangler dev` on `localhost:8787` with no cloud calls.

**Out of scope for Phase 9 (handled in later phases):**
- OAuth → JWT exchange and `dev-login` endpoint (Phase 10 — Authentication).
- Implementing the actual API business logic for read/write/admin endpoints (Phases 11, 12, 14).
- Frontend rewire from `src/lib/github/*` to `src/lib/api/*` (Phase 13).
- Production deployment, secrets, OAuth app registration in CF (Phase 15).
- Decommissioning v1 GitHub Issues code paths (Phase 15).
- D1 FTS5 search implementation (Phase 11 builds on this phase's schema).

**Phase Goal (from ROADMAP):** The Hono API worker runs locally against a seeded local D1 database with no cloud dependencies, giving the team a production-equivalent dev environment from day one.

</domain>

<decisions>
## Implementation Decisions

Everything in `design/change-request-v2.md` is treated as a locked decision. Categorized below.

### Backend Stack (locked)
- **Runtime:** Cloudflare Workers (Hono framework). Workers already in use; Hono is tiny, fast, TypeScript-first.
- **Database:** Cloudflare D1 (SQLite). Free tier covers 50–400 users; sufficient at scale.
- **ORM:** Drizzle ORM. Type-safe, edge-compatible, lightweight.
- **Migrations:** `drizzle-kit push` for dev, `drizzle-kit migrate` for prod.
- **Search engine (schema-level):** D1 FTS5 (built into SQLite). FTS5 virtual tables will be created in this phase's schema; the `/search` endpoint itself is later.

### Worker Architecture (locked)
- **Single API worker** with Hono — not one worker per resource. Easier to develop and deploy.
- **Location:** `src/workers/api/`.
- **Route module layout** (skeletons in this phase):
  - `routes/auth.ts`, `routes/prompts.ts`, `routes/comments.ts`, `routes/reactions.ts`, `routes/admin.ts`, `routes/users.ts`, `routes/search.ts`
- **Middleware skeletons:** `middleware/auth.ts` (JWT verify), `middleware/role.ts` (maintainer guard). Implementations land in Phase 10; this phase establishes the file/module structure only.
- **DB bindings:** `db/schema.ts`, `db/migrations/0001_initial.sql` (or drizzle-kit-generated equivalent).

### Data Model (locked — full schema)

These tables MUST exist in the Drizzle schema and the initial migration after this phase:

```
users(id, github_id, github_login, name, avatar_url, role, created_at)
  -- role: 'user' | 'maintainer'

prompts(id, author_id, title, body, category, model, difficulty, status,
        created_at, updated_at)
  -- status: 'published' | 'flagged' | 'hidden' | 'draft'
  -- category, model, difficulty: stored as columns (NOT inside frontmatter body)

prompt_tags(prompt_id, tag)
  -- many-to-many; max 5 tags per prompt enforced at write time (later phase)

prompt_versions(id, prompt_id, version_number, body, changelog, author_id, created_at)

comments(id, prompt_id, author_id, body, created_at, deleted_at)

reactions(prompt_id, user_id, emoji, created_at)
  -- composite PK (prompt_id, user_id, emoji)
  -- emoji enum: 'thumbs_up' | 'heart' | 'rocket'

bookmarks(user_id, prompt_id, created_at)
  -- moves bookmarks off localStorage to server (cross-device sync)

moderation_log(id, prompt_id, actor_id, action, reason, created_at)

labels(id, prefix, value, color, description)
  -- admin-managed taxonomy (categories/models/difficulties/tags)

notifications(id, user_id, type, prompt_id, comment_id, read_at, created_at)
```

### Schema Modeling Decisions (locked)
- **Frontmatter is normalized into columns.** `category`, `model`, `difficulty` become real columns; `tags` becomes a join table; `prompts.body` stores pure markdown (no embedded YAML for queryable fields).
- **Bookmarks live in the DB** (server-side), not localStorage. Phase 9 just creates the table — endpoints come in Phase 12.
- **Labels stay as a managed table**, not enums. Admin label management is preserved.
- **Reaction emojis are a fixed set** of three: `thumbs_up`, `heart`, `rocket`.

### Local Development Stack (locked)
- **Two-terminal workflow:**
  - Terminal 1: `npm run dev` (Vite, frontend on `localhost:5173`).
  - Terminal 2: `wrangler dev` (workerd runtime, API on `localhost:8787`).
- **Local D1:** Auto-created SQLite under `.wrangler/state/v3/d1/`.
- **Local R2:** Emulated under `.wrangler/state/v3/r2/` (Phase 9 doesn't use R2 directly but should not break it).
- **Local secrets:** `.dev.vars` (gitignored) loaded by wrangler.
- **Local env:** `.env.local` (gitignored) loaded by Vite.

### `.dev.vars` Template Content (locked)
Must document at minimum:
```
ENV=dev
GITHUB_CLIENT_ID=Iv1.localdev...
GITHUB_CLIENT_SECRET=xxx
JWT_SECRET=any-random-string-for-dev
```

### `.env.example` Content (locked)
Must include at minimum:
```
VITE_API_URL=http://localhost:8787
```
(And drop `VITE_GITHUB_OWNER` / `VITE_GITHUB_DATA_REPO` if currently present — but **deletion of v1 vars happens in Phase 15 / DECOM-08**. Phase 9 only needs to ensure the new vars are documented; it should not yet remove the v1 ones if removing them would break the v1 build before Phase 15.)

### Seed Script (locked)
- Command: `npm run seed`.
- Populates **dev users** (at minimum: a regular `dev-user` and a `dev-maintainer` — the same fixtures the dev-login endpoint will use in Phase 10).
- Populates **sample prompts** (small set, enough to make Browse + Detail screens demoable locally).
- Idempotent OR documented as destructive — implementer choice, but the behavior must be documented.

### Documentation Output (locked)
- The two-terminal workflow MUST be documented in `CONTRIBUTING.md` (or equivalent doc) such that a fresh developer can complete local setup without consulting anyone (Success Criteria #5).
- Must include: clone → install → `.dev.vars` setup → `.env.local` setup → `drizzle-kit push` → `npm run seed` → start both servers → inspect DB via `wrangler d1 execute --local`.

### Claude's Discretion

Areas the PRD does not lock — implementer chooses, but should follow the principles in `design/change-request-v2.md`:

- Specific TypeScript types / interfaces for the Drizzle schema (column types, defaults, indexes beyond the PKs/uniques implied above).
- Exact file split inside `src/workers/api/` beyond the named route/middleware/db files.
- Whether the Hono app exports a single default fetch handler or composes multiple Hono routers.
- The exact Drizzle column types for IDs (TEXT cuid/ulid vs. INTEGER autoincrement) — pick one and apply consistently.
- Which existing `wrangler.toml` env / vars structure to reuse vs. add a `[[d1_databases]]` block.
- Whether `prompt-community-db` is the local D1 binding name (PRD uses it in an example; implementer may keep or rename).
- Whether to put the API worker in the same `wrangler.toml` as existing workers (multi-entry) or a separate config file under `src/workers/api/wrangler.toml`.
- The exact NPM script wiring for `seed` (TS file run via `wrangler` exec / `tsx` / etc.).
- Index choices on the schema (e.g., index on `prompts.author_id`, `prompts.status`, FTS5 virtual table over `prompts.title`/`body`/tags) — recommend creating obvious read-path indexes now since later phases assume them.
- Whether to scaffold all route modules with stubs (returning 501) or only register the Hono app skeleton with a health route. Recommendation: scaffold all module files with stubs so Phase 10/11/12 just fill in handlers.
- How to organize Drizzle migration files (one big `0001_initial.sql` vs. drizzle-kit-generated multi-file output).
- TypeScript config / tsconfig.json adjustments needed for the worker (separate `tsconfig.worker.json` is a common pattern).

</decisions>

<specifics>
## Specific Ideas

Concrete references and examples from the PRD that this phase should honor:

- **Health check command** (Success Criteria #3): `wrangler d1 execute prompt-community-db --local --command "SELECT * FROM prompts"` should return seeded rows. The DB binding name `prompt-community-db` is illustrative — implementer may rename, but the command must work end-to-end.
- **Workerd parity:** `wrangler dev` uses the same runtime as production, so there is no emulation gap — code paths that work locally must work in prod (this phase doesn't deploy to prod, but the code must not depend on Node-only APIs).
- **Categories / models / difficulties become real DB rows or fixed enums** — not GitHub labels. Phase 9 establishes them as columns + a `labels` table (admin-managed taxonomy preserved).
- **Reactions are emojis, not GitHub reactions** — `'thumbs_up' | 'heart' | 'rocket'`.
- **Token never reaches browser** — even though OAuth handler implementation is Phase 10, the route file `routes/auth.ts` should be scaffolded now so Phase 10 has a place to land.
- **JWT_SECRET is required in `.dev.vars`** — this phase documents it; Phase 10 reads it.
- **Effort guidance:** PRD calls out ~25–30% net new code is backend overall. Phase 9 is the largest new-backend slice. Don't try to also implement business logic — keep this phase about scaffolding.

</specifics>

<deferred>
## Deferred Ideas

Items in the PRD explicitly marked future, out-of-scope, or owned by a later phase:

**Out of scope for v2.0 entirely** (per `REQUIREMENTS.md` "Out of Scope" table):
- Data migration script (no v1 production users to migrate).
- Postgres/Neon/Supabase backends.
- Fly.io/Railway/Render hosts.
- GraphQL API.
- Real-time chat, video posts, mobile app.
- GitHub App (OAuth App is sufficient).
- Dropping MiniSearch (offline PWA browsing remains a hard requirement; D1 FTS5 + MiniSearch coexist).
- Dropping PWA / service worker.

**Deferred to later phases of v2.0:**
- **Phase 10 (Authentication):** OAuth callback exchange, JWT signing, HttpOnly cookie, JWT middleware, role middleware, `/me`, `dev-login`, scope reduction, `useAuthStore` rewire, separate dev/prod OAuth Apps.
- **Phase 11 (Read API + FTS5):** All `GET` endpoints, server-side search using FTS5.
- **Phase 12 (Write API):** All write endpoints (`POST`, `PATCH`, `DELETE`), versions, comments, reactions, bookmarks, notifications.
- **Phase 13 (Frontend rewire):** `src/lib/api/*` modules, composable rewire, `etag.ts` deletion, MiniSearch retention, activity tab data.
- **Phase 14 (Admin & moderation):** `/admin/*` routes, label management, error envelope, role middleware enforcement.
- **Phase 15 (Decommission + deploy):** Delete `src/lib/github/*`, archive `prompt-community-data` repo, clean `wrangler.toml`, drop v1 env vars, update planning artifacts (PRD/architecture/epics/research banner), production deploy via `wrangler deploy`, prod D1 + secrets, prod OAuth callback.

**Open questions (PRD §7) — not blocking Phase 9:**
- Real GitHub OAuth handshake in CI (mitigated by `dev-login` in Phase 10, not Phase 9).
- Cutover scope (full parity vs. core read/write only) — affects later phases, not Phase 9.

</deferred>

---

*Phase: 09-backend-foundation*
*Context gathered: 2026-05-05 via PRD Express Path*
