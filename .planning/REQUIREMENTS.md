# Requirements: prompt-community v2.0 Backend Migration

**Defined:** 2026-05-05
**Core Value:** Any employee can find a proven AI prompt and use it immediately — no login, no friction, zero time between discovery and value.
**Source spec:** `design/change-request-v2.md` (locked PRD)

## v2.0 Requirements

Requirements for the v2.0 milestone. Every REQ-ID maps to a roadmap phase.

### Backend Foundation (BACK)

Hono API worker, Cloudflare D1, Drizzle ORM, schema, migrations.

- [x] **BACK-01**: Hono API worker scaffolded under `src/workers/api/` with route modules per resource
- [x] **BACK-02**: Cloudflare D1 binding configured in `wrangler.toml` for both local and production
- [x] **BACK-03**: Drizzle ORM schema defined for all tables: `users`, `prompts`, `prompt_tags`, `prompt_versions`, `comments`, `reactions`, `bookmarks`, `moderation_log`, `labels`, `notifications`
- [x] **BACK-04**: `drizzle-kit` migrations runnable via `drizzle-kit push` (dev) and `drizzle-kit migrate` (prod)
- [x] **BACK-05**: `npm run seed` script seeds dev users and sample prompts into local D1
- [x] **BACK-06**: API worker runs locally via `wrangler dev` against local D1 with no cloud dependencies

### Authentication (AUTH)

OAuth → app JWT, HttpOnly cookie session, dev-login endpoint, role-based access.

- [x] **AUTH-01**: OAuth callback worker exchanges GitHub code for access token server-side (token never reaches the browser)
- [x] **AUTH-02**: OAuth callback UPSERTs user into `users` table by `github_id` (sets `login`, `name`, `avatar_url`, `role`)
- [x] **AUTH-03**: OAuth callback signs HS256 JWT with `{ sub, role }` claims and 7-day expiry
- [x] **AUTH-04**: Session JWT delivered via `HttpOnly + Secure + SameSite=Lax` cookie
- [x] **AUTH-05**: API middleware verifies JWT on every protected request and attaches the user to request context
- [x] **AUTH-06**: `users.role` (`user` | `maintainer`) replaces the GitHub `collaborators` API maintainer check
- [x] **AUTH-07**: `GET /me` returns the current user including their `role` flag
- [x] **AUTH-08**: `POST /auth/dev-login` mints a JWT for a seeded test user, gated by `ENV === 'dev'`, and returns 404 in production
- [x] **AUTH-09**: GitHub OAuth scope reduced from `public_repo` to `read:user user:email`
- [x] **AUTH-10**: Frontend `useAuthStore` holds no GitHub token; identity is read from `/me`

### REST API (API)

REST endpoints for all read and write operations, plus admin and moderation surfaces.

#### Read endpoints

- [ ] **API-01**: `GET /prompts` lists prompts with `category`, `model`, `difficulty`, `sort`, `cursor` query params
- [ ] **API-02**: `GET /prompts/:id` returns a single prompt with author, tags, and reaction counts
- [ ] **API-03**: `GET /prompts/:id/versions` lists version history with author and `created_at`
- [ ] **API-04**: `GET /prompts/:id/comments` lists comments for a prompt
- [ ] **API-05**: `GET /search?q=` performs server-side full-text search via D1 FTS5
- [ ] **API-06**: `GET /users/:login` returns a user's public profile
- [ ] **API-07**: `GET /users/:login/prompts` returns the user's submissions
- [ ] **API-08**: `GET /users/:login/activity` returns the user's activity feed (replaces "coming soon" placeholder)
- [ ] **API-09**: `GET /labels` lists labels (categories, models, difficulties, tags)
- [ ] **API-10**: `GET /notifications` returns the current user's notifications

#### Write endpoints

- [ ] **API-11**: `POST /prompts` creates a prompt (authenticated)
- [ ] **API-12**: `PATCH /prompts/:id` updates a prompt (author only)
- [ ] **API-13**: `DELETE /prompts/:id` deletes a prompt (author or maintainer)
- [ ] **API-14**: `POST /prompts/:id/versions` publishes a new version (replaces version-as-comment)
- [ ] **API-15**: `POST /prompts/:id/versions/:n/restore` restores a prior version non-destructively
- [ ] **API-16**: `POST /prompts/:id/comments` creates a comment (authenticated)
- [ ] **API-17**: `DELETE /comments/:id` deletes a comment (author or maintainer)
- [ ] **API-18**: `POST /prompts/:id/reactions` adds an emoji reaction (`thumbs_up` | `heart` | `rocket`)
- [ ] **API-19**: `DELETE /prompts/:id/reactions` removes the caller's reaction
- [ ] **API-20**: `POST /bookmarks` and `DELETE /bookmarks/:promptId` manage server-side bookmarks (cross-device sync)
- [ ] **API-21**: `POST /notifications/:id/read` marks a notification read

#### Admin & moderation endpoints

- [ ] **API-22**: `GET /admin/queue` returns flagged prompts (maintainer only)
- [ ] **API-23**: `GET /admin/log` returns the moderation log (maintainer only)
- [ ] **API-24**: `POST /admin/prompts/:id/approve` approves a flagged prompt (maintainer only)
- [ ] **API-25**: `POST /admin/prompts/:id/hide` hides a prompt (maintainer only)
- [ ] **API-26**: `POST /labels`, `PATCH /labels/:id`, `DELETE /labels/:id` manage labels (maintainer only)
- [ ] **API-27**: API errors return a consistent JSON shape with appropriate HTTP status codes
- [ ] **API-28**: All admin and write routes are guarded by JWT middleware + role middleware where appropriate

### Frontend Rewire (FRONT)

Replace `src/lib/github/*` consumers with `src/lib/api/*`. UI components remain untouched.

- [ ] **FRONT-01**: `src/lib/api/client.ts` provides a fetch wrapper that injects credentials and handles auth/error responses
- [ ] **FRONT-02**: `src/lib/api/prompts.ts` replaces `src/lib/github/queries.ts` and `mutations.ts` for prompt operations
- [ ] **FRONT-03**: `src/lib/api/comments.ts` replaces GitHub comment paths
- [ ] **FRONT-04**: `src/lib/api/reactions.ts` replaces GitHub reaction paths
- [ ] **FRONT-05**: `src/lib/api/users.ts` replaces GitHub user lookup paths
- [ ] **FRONT-06**: `src/lib/api/admin.ts` replaces GitHub admin/maintainer paths
- [ ] **FRONT-07**: `src/composables/queries/*.ts` re-import from `@/lib/api/*` (TanStack Query cache keys preserved)
- [ ] **FRONT-08**: `src/composables/mutations/*.ts` re-import from `@/lib/api/*`
- [ ] **FRONT-09**: `useAuthStore` updated for JWT/cookie session shape; `isMaintainer` comes from `/me`
- [ ] **FRONT-10**: `src/lib/github/etag.ts` deleted; TanStack Query `staleTime` + standard HTTP cache headers replace it
- [ ] **FRONT-11**: Activity tab placeholder replaced by data wired through `/users/:login/activity`

### Search (SEARCH)

D1 FTS5 server-side search alongside MiniSearch for offline PWA browsing.

- [ ] **SEARCH-01**: D1 FTS5 virtual table indexes prompt `title`, `body`, and `tags`
- [ ] **SEARCH-02**: `GET /search` uses FTS5 `MATCH` for ranked results
- [ ] **SEARCH-03**: MiniSearch client-side index retained for offline PWA browsing (built from API responses)
- [ ] **SEARCH-04**: Service worker continues caching prompt list responses for offline read

### Local Development (DEV)

Airplane-mode dev workflow with `wrangler dev`, local D1, and dev-login.

- [x] **DEV-01**: `.dev.vars` template documents `ENV`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`
- [x] **DEV-02**: `.env.example` provides `VITE_API_URL=http://localhost:8787`
- [x] **DEV-03**: Two-terminal dev workflow (`npm run dev` + `wrangler dev`) documented in `CONTRIBUTING.md` or equivalent
- [ ] **DEV-04**: Separate GitHub OAuth Apps registered for `dev` (localhost callback) and `prod`
- [x] **DEV-05**: Local D1 inspectable via `wrangler d1 execute --local` (documented)

### Deployment (DEPLOY)

Production deployment of the API worker and D1.

- [ ] **DEPLOY-01**: API worker deployable to Cloudflare via `wrangler deploy`
- [ ] **DEPLOY-02**: Production D1 database provisioned and migrated from CI or operator workflow
- [ ] **DEPLOY-03**: Production secrets (`JWT_SECRET`, `GITHUB_CLIENT_SECRET`) configured via `wrangler secret`
- [ ] **DEPLOY-04**: Production OAuth App callback URL configured against the deployed worker host

### Decommission & Documentation (DECOM)

Remove v1 GitHub-Issues code paths, archive the data repo, update planning docs.

- [ ] **DECOM-01**: `src/lib/github/octokit.ts` deleted
- [ ] **DECOM-02**: `src/lib/github/queries.ts` deleted
- [ ] **DECOM-03**: `src/lib/github/mutations.ts` deleted
- [ ] **DECOM-04**: `src/lib/github/etag.ts` deleted
- [ ] **DECOM-05**: `src/lib/github/auth.ts` deleted (server-side maintainer check replaces it)
- [ ] **DECOM-06**: `prompt-community-data` repository archived (no longer used as a data store)
- [ ] **DECOM-07**: `wrangler.toml` cleaned of two-repo configuration
- [ ] **DECOM-08**: `.env.example` drops `VITE_GITHUB_OWNER` and `VITE_GITHUB_DATA_REPO`
- [ ] **DECOM-09**: `design/planning-artifacts/product-brief-prompt-community-2026-03-14.md` updated to reflect v2 architecture
- [ ] **DECOM-10**: `design/planning-artifacts/prd.md` updated for v2 (NFR rewrites, FR reword for non-GH terms)
- [ ] **DECOM-11**: `design/planning-artifacts/architecture.md` rewritten for v2 (Data, Auth, API, Caching sections)
- [ ] **DECOM-12**: `design/planning-artifacts/epics.md` updated to add Epic 0: Backend Foundation
- [ ] **DECOM-13**: `design/research/vue-github-issues-platform-research.md` marked historical / superseded with banner

## Future Requirements

Tracked but deferred until v2.0 ships.

### Growth (GROW)

- **GROW-01**: Team collections — curated prompt sets per squad or domain
- **GROW-02**: Slack/Teams integration hooks for new/featured prompts
- **GROW-03**: AI-assisted discovery — surface prompts based on role or browsing behaviour

## Out of Scope

Explicitly excluded from v2.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Data migration script | Pre-launch confirmed — no production users on v1 |
| Move to Postgres / Neon / Supabase | Cloudflare-only constraint; D1 is sufficient at 50–400 users |
| Move to Fly.io / Railway / Render | Cloudflare-only constraint; keeps deploy story single-vendor |
| GraphQL API | REST is simpler; v1 GraphQL was driven by GitHub API, not a product requirement |
| Real-time chat | High complexity, not core to community value |
| Video posts | Storage/bandwidth costs |
| Mobile app | Web-first; PWA covers mobile use case |
| GitHub App (vs OAuth App) | OAuth App is sufficient; upgrade path remains documented |
| Drop MiniSearch | Offline PWA browsing is a hard requirement; D1 FTS5 + MiniSearch coexist |
| Drop PWA / service worker | Offline read is a validated v1 capability |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

**Coverage:**
- v2.0 requirements: 81 total
- Mapped to phases: 81
- Unmapped: 0 ✓

| REQ-ID | Phase | Status |
|--------|-------|--------|
| BACK-01 | Phase 9 | Complete |
| BACK-02 | Phase 9 | Complete |
| BACK-03 | Phase 9 | Complete |
| BACK-04 | Phase 9 | Complete |
| BACK-05 | Phase 9 | Complete |
| BACK-06 | Phase 9 | Complete |
| DEV-01 | Phase 9 | Complete |
| DEV-02 | Phase 9 | Complete |
| DEV-03 | Phase 9 | Complete |
| DEV-05 | Phase 9 | Complete |
| AUTH-01 | Phase 10 | Complete |
| AUTH-02 | Phase 10 | Complete |
| AUTH-03 | Phase 10 | Complete |
| AUTH-04 | Phase 10 | Complete |
| AUTH-05 | Phase 10 | Complete |
| AUTH-06 | Phase 10 | Complete |
| AUTH-07 | Phase 10 | Complete |
| AUTH-08 | Phase 10 | Complete |
| AUTH-09 | Phase 10 | Complete |
| AUTH-10 | Phase 10 | Complete |
| DEV-04 | Phase 10 | Pending |
| API-01 | Phase 11 | Pending |
| API-02 | Phase 11 | Pending |
| API-03 | Phase 11 | Pending |
| API-04 | Phase 11 | Pending |
| API-05 | Phase 11 | Pending |
| API-06 | Phase 11 | Pending |
| API-07 | Phase 11 | Pending |
| API-08 | Phase 11 | Pending |
| API-09 | Phase 11 | Pending |
| API-10 | Phase 11 | Pending |
| SEARCH-01 | Phase 11 | Pending |
| SEARCH-02 | Phase 11 | Pending |
| API-11 | Phase 12 | Pending |
| API-12 | Phase 12 | Pending |
| API-13 | Phase 12 | Pending |
| API-14 | Phase 12 | Pending |
| API-15 | Phase 12 | Pending |
| API-16 | Phase 12 | Pending |
| API-17 | Phase 12 | Pending |
| API-18 | Phase 12 | Pending |
| API-19 | Phase 12 | Pending |
| API-20 | Phase 12 | Pending |
| API-21 | Phase 12 | Pending |
| FRONT-01 | Phase 13 | Pending |
| FRONT-02 | Phase 13 | Pending |
| FRONT-03 | Phase 13 | Pending |
| FRONT-04 | Phase 13 | Pending |
| FRONT-05 | Phase 13 | Pending |
| FRONT-06 | Phase 13 | Pending |
| FRONT-07 | Phase 13 | Pending |
| FRONT-08 | Phase 13 | Pending |
| FRONT-09 | Phase 13 | Pending |
| FRONT-10 | Phase 13 | Pending |
| FRONT-11 | Phase 13 | Pending |
| SEARCH-03 | Phase 13 | Pending |
| SEARCH-04 | Phase 13 | Pending |
| API-22 | Phase 14 | Pending |
| API-23 | Phase 14 | Pending |
| API-24 | Phase 14 | Pending |
| API-25 | Phase 14 | Pending |
| API-26 | Phase 14 | Pending |
| API-27 | Phase 14 | Pending |
| API-28 | Phase 14 | Pending |
| DECOM-01 | Phase 15 | Pending |
| DECOM-02 | Phase 15 | Pending |
| DECOM-03 | Phase 15 | Pending |
| DECOM-04 | Phase 15 | Pending |
| DECOM-05 | Phase 15 | Pending |
| DECOM-06 | Phase 15 | Pending |
| DECOM-07 | Phase 15 | Pending |
| DECOM-08 | Phase 15 | Pending |
| DECOM-09 | Phase 15 | Pending |
| DECOM-10 | Phase 15 | Pending |
| DECOM-11 | Phase 15 | Pending |
| DECOM-12 | Phase 15 | Pending |
| DECOM-13 | Phase 15 | Pending |
| DEPLOY-01 | Phase 15 | Pending |
| DEPLOY-02 | Phase 15 | Pending |
| DEPLOY-03 | Phase 15 | Pending |
| DEPLOY-04 | Phase 15 | Pending |

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 — traceability populated by gsd-roadmapper*
