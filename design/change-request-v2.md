# Migration Proposal: GitHub Issues → Proper Backend (with GitHub OAuth retained)

**Status:** Proposal / Change Request for v2.0
**Date:** 2026-05-04
**Author:** Davor (drafted with Claude)
**Supersedes:** v1.0 "GitHub Issues as data store" architecture (see `design/planning-artifacts/architecture.md`)

---

## TL;DR

The current implementation is a **zero-server SPA** that uses GitHub Issues as a creative-but-leaky database. v2 keeps GitHub OAuth (login only) and moves all data — prompts, comments, votes, labels, versions, moderation — into a real backend with a proper API. This is a **significant architectural shift** from "frontend-only" to **"frontend + backend"**, but the UI layer (~70% of code) survives untouched.

---

## 1. What changes — and what doesn't

### Stays the same (UI & UX)
- All 6 screens (S01–S06): App Shell, Browse/Detail, Editor, Version History, Admin, Profile
- All 54 FRs: same features, same flows, same wireframes
- Tech stack frontend: Vue 3, Vite, shadcn-vue, Tailwind 4, Pinia, TanStack Query, vue-router
- All `src/components/*`, `src/views/*`, `src/router/*`, draft store, bookmarks store
- YAML frontmatter as a *serialization* concept stays, but it becomes optional — the new schema can store fields as proper columns AND/OR keep an opaque body field.

### Stays in spirit, but reshapes
- **Auth**: GitHub OAuth flow stays. The Cloudflare Worker stops `postMessage`-ing the GitHub token to the SPA. Instead it exchanges the GH code for a **first-party session JWT** that the SPA uses for its own backend.
- **MiniSearch**: was *required* because of GitHub's 30 req/min Search API cap. With your own backend, full-text search can move server-side (Postgres FTS, Meilisearch, Typesense, or D1 FTS5). Client-side MiniSearch becomes optional — keep only if PWA offline search matters.
- **ETag / 304 caching**: was *required* because of the 5,000 req/hr ceiling. Without that ceiling, this layer simplifies to standard HTTP cache headers + TanStack Query `staleTime`.
- **Optimistic mutations**: pattern stays, but now hits your endpoints. Rollback semantics are easier because you control error responses.

### Goes away entirely
- "GitHub Issues as data store" — labels-as-categories, reactions-as-votes, comments-as-comments, comments-as-version-history.
- Two-repo architecture (`prompt-community` + `prompt-community-data`). No more data repo.
- GitHub `public_repo` scope — drop to `read:user user:email` only.
- Maintainer check via GitHub `collaborators` API → moves to your `users.role` column.
- All ~21 files under `src/lib/github/*` and `src/composables/queries|mutations/*` get rewired.

---

## 2. New architecture (proposal — flag anything to push back on)

### Backend
**Recommendation: Cloudflare Workers + D1 + R2** — keeps the existing free-tier philosophy, single deploy command, no new vendor.

| Concern | Choice | Why |
|---|---|---|
| Runtime | Cloudflare Workers (Hono framework) | Workers are already in use. Hono is tiny, fast, TypeScript-first. |
| DB | Cloudflare D1 (SQLite) | Free tier covers 50–400 users easily. Migrations via `drizzle-kit`. |
| ORM | Drizzle ORM | Type-safe, edge-compatible, lightweight. |
| Auth | Custom JWT (HS256) issued by OAuth callback worker | Stateless, edge-friendly, 7-day expiry + refresh. |
| Search | D1 FTS5 (built into SQLite) | Free, sufficient at this scale. Meilisearch is the upgrade if needed. |
| Files (images) | R2 (already planned) | Unchanged. |

**Alternatives worth considering:**
- **Hono + Neon/Supabase Postgres** if richer SQL, JSONB, real FTS are needed. More dependencies but much more headroom.
- **Express/Fastify + Postgres on Fly.io / Railway** for a stateful Node backend with traditional DX. Higher ops cost.

Default to **CF Workers + D1 + Drizzle + Hono** unless there's reason to leave Cloudflare.

### Auth flow (revised)
```
Browser → GH /authorize → GH /callback → CF Worker /callback
  Worker:
    1. Exchange code for GH access_token (server-side only, never leaks)
    2. Fetch GH user profile
    3. UPSERT into users table (id, github_id, login, avatar_url, role)
    4. Sign JWT { sub: user.id, role } with 7d expiry
    5. Set HttpOnly + Secure + SameSite=Lax cookie OR return JSON to popup
  Browser → SPA stores JWT (HttpOnly cookie preferred; trade-off: needs same-site backend or proper CORS)
```

The GitHub access token is **discarded** after step 3 (or kept server-side if profile re-fetch is ever needed).

### Data model (proposed)
```
users(id, github_id, github_login, name, avatar_url, role, created_at)   -- role: 'user' | 'maintainer'
prompts(id, author_id, title, body, category, model, difficulty, status, created_at, updated_at)
                                                                          -- status: 'published'|'flagged'|'hidden'|'draft'
prompt_tags(prompt_id, tag)                                               -- many-to-many, max 5 per prompt
prompt_versions(id, prompt_id, version_number, body, changelog, author_id, created_at)
comments(id, prompt_id, author_id, body, created_at, deleted_at)
reactions(prompt_id, user_id, emoji, created_at)                          -- PK (prompt_id, user_id, emoji); emoji: 'thumbs_up'|'heart'|'rocket'
bookmarks(user_id, prompt_id, created_at)                                 -- moves bookmarks off localStorage to server (optional)
moderation_log(id, prompt_id, actor_id, action, reason, created_at)
labels(id, prefix, value, color, description)                             -- if keeping label-management; otherwise drop & use enums
notifications(id, user_id, type, prompt_id, comment_id, read_at, created_at)
```

Categories, models, difficulties become **enums or a small `labels` table** instead of GitHub labels. The admin "Label Manager" screen now manages real DB rows.

### REST API surface (sketch)
```
POST   /auth/github/callback        # OAuth exchange → JWT
GET    /me                          # current user
GET    /prompts?category=&model=&difficulty=&sort=&cursor=
POST   /prompts                     # create
GET    /prompts/:id
PATCH  /prompts/:id
DELETE /prompts/:id
GET    /prompts/:id/versions
POST   /prompts/:id/versions        # publish new version (replaces "version comment")
POST   /prompts/:id/versions/:n/restore
GET    /prompts/:id/comments
POST   /prompts/:id/comments
DELETE /comments/:id
POST   /prompts/:id/reactions       { emoji }
DELETE /prompts/:id/reactions       { emoji }
GET    /search?q=                   # backend FTS
GET    /users/:login                # profile
GET    /users/:login/prompts
GET    /users/:login/activity
GET    /admin/queue                 # flagged prompts (maintainer only)
GET    /admin/log
POST   /admin/prompts/:id/approve
POST   /admin/prompts/:id/hide
GET    /labels                      # if keeping label management
POST   /labels   PATCH /labels/:id   DELETE /labels/:id
GET    /notifications
POST   /notifications/:id/read

# Dev-only (gated by ENV === 'dev'; never registered in production builds)
POST   /auth/dev-login              { login? }   # mints a JWT for a seeded test user
```

---

## 3. Document-by-document change list

### `design/planning-artifacts/product-brief-prompt-community-2026-03-14.md`
**Change:** "Constraints" / "Why GitHub Issues" sections need rewriting. The product brief still describes the *product* correctly (internal AI-prompt sharing), but the rationale for "no backend" is obsolete. Add a paragraph explaining the v2 decision: *the GitHub Issues approach hit limits around X, Y, Z; the move to a first-party API enables A, B, C.*

### `design/planning-artifacts/prd.md`
**Change:** Several FRs reference GitHub-specific behaviors:
- FR around "votes" framed as "GitHub reactions" → reword as "user reactions (👍 ❤️ 🚀)"
- FR around "version history as comments" → reword as "version history as separate version records"
- FR around "categories as labels" → reword as "categories as fixed taxonomy + admin-managed tags"
- NFR-S1 (token in memory only) becomes obsolete — replaced by HttpOnly session cookie NFR
- NFR around "5,000 req/hr GitHub limit" — delete; replace with backend SLA targets (e.g., p95 < 200ms)
- NFR around "MiniSearch < 50ms" — make this optional / move to "if offline mode required"

### `design/planning-artifacts/architecture.md`
**Change:** Substantial rewrite, but most patterns survive. Specifically:
- `## Data Architecture` — full rewrite: D1 schema, Drizzle, migrations, FTS5
- `## Authentication & Security` — token exchange now produces internal JWT, not stored GH token. CSRF still via state cookie.
- `## API & Communication Patterns` — GraphQL/REST split goes away. New section: REST conventions (cursors, error shape, status codes).
- `## Caching Strategy` — drop ETag layer. Keep TanStack Query staleTime. Add backend-side caching (KV cache for hot reads, if needed).
- `## Frontend Architecture` — mostly survives. `useAuthStore` shape changes (JWT instead of GH token). Cache keys stay valid.
- `## Infrastructure & Deployment` — add D1 + worker API deploy. Two-repo architecture goes away.
- `## Implementation Patterns & Consistency Rules` — section on "Where GitHub API Logic Lives" becomes "Where Backend API Logic Lives" (`src/lib/api/` instead of `src/lib/github/`).

### `design/planning-artifacts/epics.md`
**Change:** Add a new epic **Epic 0: Backend Foundation** ahead of everything else — schema, migrations, auth, core CRUD endpoints, deploy. Existing epics shrink slightly (no GitHub API plumbing) but otherwise stay the same. Some moderation epic items get easier (no label fiddling).

### `design/research/vue-github-issues-platform-research.md`
**Change:** Mark as historical / superseded. Add a one-line banner: *"This research informed v1. v2 moves to a first-party backend; see architecture.md."* Don't delete — it's useful context.

### `.planning/PROJECT.md` / `ROADMAP.md` / `MILESTONES.md`
**Change:** v1.0 is complete (per recent commits). This is a v2.0 milestone. Create a new milestone "Backend Migration" with phases:
1. Schema + migrations + drizzle setup
2. Auth: OAuth → JWT cookie
3. Core read API (prompts, comments, reactions)
4. Core write API + versions + moderation
5. Frontend swap: `lib/github/` → `lib/api/`
6. Cutover + data import (one-shot script: read existing GH issues → write to D1)
7. Decommission GH issues data repo

---

## 4. Implementation change list (codebase)

### Files to **delete or archive**
- `src/lib/github/octokit.ts`
- `src/lib/github/queries.ts` (all GraphQL strings)
- `src/lib/github/mutations.ts` (all REST writes)
- `src/lib/github/etag.ts` (no longer needed)
- `src/lib/github/auth.ts` — `verifyMaintainerStatus` moves server-side

### Files to **create**
- `src/workers/api/` — new Hono app (or keep separate worker)
  - `routes/auth.ts`, `routes/prompts.ts`, `routes/comments.ts`, `routes/reactions.ts`, `routes/admin.ts`, `routes/users.ts`, `routes/search.ts`
  - `db/schema.ts` (Drizzle schema)
  - `db/migrations/0001_initial.sql`
  - `middleware/auth.ts` (JWT verify), `middleware/role.ts` (maintainer guard)
- `src/lib/api/client.ts` — fetch wrapper with auth header injection
- `src/lib/api/prompts.ts`, `comments.ts`, `reactions.ts`, `users.ts`, `admin.ts` — drop-in replacements for `lib/github/*`
- One-shot migration script: `scripts/migrate-issues-to-d1.ts` — reads existing prompt issues, parses frontmatter, writes to D1

### Files to **modify** (small surface)
- `src/composables/queries/*.ts` — change imports from `@/lib/github/*` to `@/lib/api/*`. Cache keys unchanged. ~14 files, mostly mechanical.
- `src/composables/mutations/*.ts` — same as above.
- `src/stores/useAuthStore.ts` — token shape changes (GH token → app JWT or rely on HttpOnly cookie). `isMaintainer` comes from `/me` response, not GH collaborators check.
- `src/workers/oauth.ts` — exchange code with GH, then UPSERT user into D1, sign JWT, return cookie.
- `src/lib/search.ts` — either delete (server search) or keep as thin client cache. Probably **delete for v2** unless offline is a requirement.
- `wrangler.toml` — add D1 binding, second worker entry point for API.
- `.env.example` — drop `VITE_GITHUB_OWNER`, `VITE_GITHUB_DATA_REPO`. Add `VITE_API_URL`, server-side `JWT_SECRET`.

### Files **untouched**
- All of `src/components/**` (UI is data-source agnostic)
- All of `src/views/**`
- `src/router/**`
- `src/lib/frontmatter.ts` (still useful as an internal serialization for the prompt body field, OR delete if the body is now plain markdown + DB columns)
- `src/lib/diff.ts` (jsdiff is still right for showing version diffs)
- `src/stores/usePromptsStore.ts`, `useDraftStore.ts`, `useBookmarksStore.ts`, `useUIStore.ts`

**Effort estimate (rough):** ~25–30% net new code (backend), ~10% modification (composables/stores/auth), ~65% untouched (UI). 4–6 weeks for a careful phased migration with data import.

---

## 5. Tradeoffs to decide on explicitly

1. **JWT in HttpOnly cookie vs. JWT in localStorage** — cookie is safer (no XSS exfiltration), but requires same-site or strict CORS. Recommend cookie.
2. **Frontmatter retained or normalized into columns** — keeping frontmatter inside `prompts.body` is simpler but loses queryability. Normalizing into columns is the "real" relational answer. Recommend columns for `category`, `model`, `difficulty`, plus a `tags` join table; body becomes pure markdown.
3. **Server-side search vs. keep MiniSearch** — server-side is simpler and more correct. Keep MiniSearch only if offline-PWA-search is a hard requirement.
4. **Bookmarks: localStorage vs. server table** — moving server-side gives cross-device sync (a real upgrade). localStorage is one less endpoint.
5. **Single API worker vs. one worker per resource** — single worker with Hono is much easier to develop and deploy.
6. **Data migration: keep GH issues read-only forever vs. one-shot import + delete data repo** — depends on whether the new system is trusted enough to walk away from the GH backup.

---

## 6. Local development

The v2 stack is designed to **run end-to-end on a single machine** with no cloud dependency except the GitHub OAuth handshake itself. This is a strict requirement, not a nice-to-have.

### What runs locally

| Component | Local mechanism |
|---|---|
| Vue SPA | `npm run dev` (Vite, `localhost:5173`) |
| Hono API worker | `wrangler dev` (workerd runtime, `localhost:8787`) — same runtime as production, no emulation gap |
| D1 (SQLite) | Auto-created local SQLite file under `.wrangler/state/v3/d1/` |
| R2 (object storage) | Emulated to local directory under `.wrangler/state/v3/r2/` |
| Drizzle migrations | `drizzle-kit push` / `drizzle-kit migrate` runs against local D1 |
| JWT auth | Pure code, signed with local `JWT_SECRET` from `.dev.vars` |
| Search (D1 FTS5) | Built into local SQLite — fully offline |

### Dev-only auth endpoint (offline / airplane-mode dev)

GitHub OAuth requires a round-trip to `github.com`. To support fully offline development and CI, the API worker exposes a **dev-only login endpoint** gated by environment.

**Endpoint:** `POST /auth/dev-login` with optional `{ login: string }` body.

**Behavior:**
1. Reject the request unless `env.ENV === 'dev'` (returns 404 in prod so the route is invisible).
2. Look up (or seed) a fixed test user — e.g. `dev-user`, `dev-maintainer` — from a small set of seeded fixtures.
3. Issue the same JWT shape as the real OAuth callback would.
4. Set the session cookie identically to the production flow.

**Implementation guardrails:**
- Route is registered conditionally: `if (env.ENV === 'dev') app.post('/auth/dev-login', ...)`. Production builds never include the handler.
- An additional safety check inside the handler (`if (env.ENV !== 'dev') return 404`) defends against misconfiguration.
- Seeded users are created by the migration runner / a dedicated `npm run seed` script, not by the endpoint itself.
- Document this clearly in the security section of `architecture.md` so it doesn't get reviewed as a vulnerability.

This pattern is what unlocks: airplane-mode development, fast E2E test suites (no GitHub round-trip), and local CI for PRs that touch backend code.

### Local config files

`.dev.vars` (gitignored, loaded by wrangler):
```
ENV=dev
GITHUB_CLIENT_ID=Iv1.localdev...
GITHUB_CLIENT_SECRET=xxx
JWT_SECRET=any-random-string-for-dev
```

`.env.local` (gitignored, loaded by Vite):
```
VITE_API_URL=http://localhost:8787
```

### Typical workflow

```bash
# Terminal 1 — frontend
npm run dev

# Terminal 2 — API worker + D1 + R2 (all local)
wrangler dev

# One-time DB setup
npx drizzle-kit push                                # apply schema to local D1
npm run seed                                        # seed dev users + sample prompts

# Inspect local DB
wrangler d1 execute prompt-community-db --local --command "SELECT * FROM prompts"
```

### GitHub OAuth in local dev

GitHub OAuth Apps allow `http://localhost` callback URLs. Recommended setup:
- Register a separate `prompt-community-dev` OAuth App with callback `http://localhost:8787/auth/github/callback`.
- Production uses a distinct `prompt-community-prod` OAuth App.
- Switch via `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` per environment.

For external-device testing (mobile, sharing previews), use `cloudflared tunnel` or `ngrok` — not required for normal localhost dev.

### What works fully offline

- ✅ Browse, create, edit prompts
- ✅ Comments, reactions, versions, moderation
- ✅ Image uploads (R2 emulator)
- ✅ Search (D1 FTS5)
- ✅ All UI flows
- ✅ Auth — via `/auth/dev-login`
- ❌ Real GitHub OAuth handshake (needs github.com — use `/auth/dev-login` instead)

### Comparison to v1's local story

v1 requires live GitHub API access during dev — you cannot browse prompts without hitting `api.github.com`, and you burn against the same 5,000 req/hr ceiling as production. v2 is **strictly more local-friendly**: once seeded, the entire app runs airplane-mode, and the dev-only login endpoint removes even the OAuth dependency.

---

## 7. Open questions

- Are there any users/data already in production on the v1 GH-Issues backend that need to be migrated, or is this still pre-launch?
- Is the deployment target locked to Cloudflare, or is moving to a stateful host (Fly.io, Railway, Render) on the table?
- Should the v2 milestone block on full feature parity, or is a "core read/write only, admin later" cutover acceptable?
- Does offline-PWA support remain a hard requirement (decides MiniSearch fate)?
