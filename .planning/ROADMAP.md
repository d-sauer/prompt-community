# Roadmap: prompt-community

## Milestones

- ✅ **v1.0 MVP** — Phases 1–8 (shipped 2026-03-26)
- 🚧 **v2.0 Backend Migration** — Phases 9–15 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–8) — SHIPPED 2026-03-26</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-15
- [x] Phase 2: Read & Contribute (3/3 plans) — completed 2026-03-15
- [x] Phase 3: Community & Profiles (3/3 plans) — completed 2026-03-15
- [x] Phase 4: Admin & PWA (3/3 plans) — completed 2026-03-25
- [x] Phase 5: Fix User Identity & Profile Navigation (1/1 plan) — completed 2026-03-26
- [x] Phase 6: Fix Command Palette & Admin Sidebar (1/1 plan) — completed 2026-03-26
- [x] Phase 7: Wire ETag Caching (1/1 plan) — completed 2026-03-26
- [x] Phase 8: Fix Admin & Search Tech Debt (1/1 plan) — completed 2026-03-26

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v2.0 Backend Migration (In Progress)

**Milestone Goal:** Replace the GitHub-Issues-as-database architecture with a first-party Cloudflare Workers + D1 + Drizzle + Hono backend, migrate the frontend to a first-party REST API, and decommission all GitHub-Issues data paths — while the Vue 3 SPA UI and GitHub OAuth login flow remain intact.

- [x] **Phase 9: Backend Foundation** — Hono worker, D1 binding, Drizzle schema + migrations, seed script, local dev workflow (completed 2026-05-05)
- [ ] **Phase 10: Auth Migration** — OAuth → JWT (HttpOnly cookie), `/me`, dev-login endpoint, role-based middleware
- [ ] **Phase 11: Read API** — All GET endpoints (prompts, comments, versions, users, search via D1 FTS5)
- [ ] **Phase 12: Write API** — Prompts/comments/reactions/versions/bookmarks/notifications POST/PATCH/DELETE
- [ ] **Phase 13: Frontend Rewire** — Swap `src/lib/github/*` → `src/lib/api/*`, store updates, drop ETag layer
- [ ] **Phase 14: Admin & Moderation API** — `/admin/queue`, `/admin/log`, label CRUD, role guards, admin panel rewire
- [ ] **Phase 15: Decommission & Docs** — Delete v1 GH-Issues code, archive data repo, rewrite product docs

## Phase Details

### Phase 9: Backend Foundation
**Goal**: The Hono API worker runs locally against a seeded local D1 database with no cloud dependencies, giving the team a production-equivalent dev environment from day one.
**Depends on**: Nothing (first v2.0 phase; builds on shipped v1.0 codebase)
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06, DEV-01, DEV-02, DEV-03, DEV-05
**Success Criteria** (what must be TRUE):
  1. Running `wrangler dev` starts the Hono API worker on `localhost:8787` with all route modules registered and no cloud calls required
  2. Running `drizzle-kit push` applies the full schema (users, prompts, prompt_tags, prompt_versions, comments, reactions, bookmarks, moderation_log, labels, notifications) to local D1 with no errors
  3. Running `npm run seed` populates local D1 with dev users and sample prompts that are queryable via `wrangler d1 execute --local`
  4. `.dev.vars` template and `.env.example` are present and document every required environment variable so a new developer can be set up from scratch
  5. Two-terminal workflow (`npm run dev` + `wrangler dev`) is documented and a developer can complete the full local setup without consulting anyone
**Plans:** 4/4 plans complete
  - [ ] 09-01-PLAN.md — Wave 0: install vitest-pool-workers, env templates, CONTRIBUTING.md skeleton (DEV-01, DEV-02, DEV-03)
  - [ ] 09-02-PLAN.md — Wave 1: Hono worker scaffold + D1 binding + boot spec (BACK-01, BACK-02, BACK-06)
  - [ ] 09-03-PLAN.md — Wave 1: Drizzle schema for 10 tables + drizzle-kit configs (BACK-03)
  - [ ] 09-04-PLAN.md — Wave 2: migrations apply, FTS5, seed, finalize CONTRIBUTING.md (BACK-04, BACK-05, DEV-03, DEV-05)

### Phase 10: Auth Migration
**Goal**: Users authenticate via GitHub OAuth and receive a first-party JWT in an HttpOnly cookie; the GitHub access token never reaches the browser, and a dev-login endpoint enables offline development without a GitHub round-trip.
**Depends on**: Phase 9
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, DEV-04
**Success Criteria** (what must be TRUE):
  1. Completing GitHub OAuth sets an `HttpOnly + Secure + SameSite=Lax` cookie containing a signed HS256 JWT; the GitHub access token is not present in any browser-accessible storage
  2. `GET /me` returns the authenticated user's `login`, `name`, `avatar_url`, and `role` (`user` | `maintainer`) read from the `users` table
  3. A request to a protected endpoint without a valid JWT receives a 401 response; a request from a user whose `role` is not `maintainer` to a maintainer-only route receives a 403
  4. `POST /auth/dev-login` returns a valid JWT cookie for a seeded test user when `ENV=dev`, and returns 404 in production
  5. Separate GitHub OAuth Apps are configured for `dev` (localhost callback) and `prod` (deployed worker callback), switchable via `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`
**Plans**: 4 plans
Plans:
- [ ] 10-01-PLAN.md — Wave 0: test scaffolds for all auth behaviors (AUTH-01 through AUTH-10)
- [ ] 10-02-PLAN.md — Wave 1: Env type refactor + GitHub OAuth login/callback handlers (AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-09)
- [ ] 10-03-PLAN.md — Wave 1: Auth middleware (requireAuth, optionalAuth, requireMaintainer) + GET /me + POST /auth/dev-login (AUTH-05, AUTH-06, AUTH-07, AUTH-08)
- [ ] 10-04-PLAN.md — Wave 2: useAuthStore rewrite + /auth/callback SPA route + DEV-04 docs (AUTH-10, DEV-04)

### Phase 11: Read API
**Goal**: All read operations — prompts listing, single prompt, versions, comments, user profiles, activity, labels, notifications, and full-text search — are served by the Hono worker from D1, replacing GitHub API reads.
**Depends on**: Phase 9, Phase 10
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10, SEARCH-01, SEARCH-02
**Success Criteria** (what must be TRUE):
  1. `GET /prompts` returns a paginated list filterable by `category`, `model`, `difficulty`, and `sort` using cursor-based pagination; all fields match the Drizzle schema
  2. `GET /search?q=<term>` returns ranked results via D1 FTS5 `MATCH` across prompt `title`, `body`, and `tags` with no GitHub Search API call
  3. `GET /users/:login/activity` returns a real activity feed for the user (the "coming soon" placeholder is now backed by data)
  4. All read endpoints return a consistent JSON shape; errors return the standard error envelope with appropriate HTTP status codes
  5. An unauthenticated request to public endpoints (`/prompts`, `/search`, `/users/:login`) succeeds; `/notifications` and `/me` require a valid JWT and return 401 without one
**Plans**: TBD

### Phase 12: Write API
**Goal**: All mutating operations — creating/updating/deleting prompts, versions, comments, reactions, bookmarks, and notifications — are handled by authenticated Hono endpoints backed by D1.
**Depends on**: Phase 11
**Requirements**: API-11, API-12, API-13, API-14, API-15, API-16, API-17, API-18, API-19, API-20, API-21
**Success Criteria** (what must be TRUE):
  1. `POST /prompts` creates a prompt row in D1 and returns it; `PATCH /prompts/:id` updates it (author only); `DELETE /prompts/:id` succeeds for the author or a maintainer and fails with 403 for anyone else
  2. `POST /prompts/:id/versions` stores a new version record; `POST /prompts/:id/versions/:n/restore` non-destructively creates a new version from a prior one
  3. Reactions can be added (`POST`) and removed (`DELETE`) per prompt per user; duplicate reactions for the same emoji are rejected
  4. Bookmarks round-trip correctly: `POST /bookmarks` saves a server-side bookmark visible across devices; `DELETE /bookmarks/:promptId` removes it
  5. All write endpoints require a valid JWT; unauthenticated requests receive 401; malformed payloads receive 422 with a descriptive error
**Plans**: TBD

### Phase 13: Frontend Rewire
**Goal**: The Vue 3 SPA fetches all data from `src/lib/api/*` instead of `src/lib/github/*`; the ETag layer is removed; the auth store reads identity from `/me`; and the Activity tab shows live data — with no changes to any UI component.
**Depends on**: Phase 12
**Requirements**: FRONT-01, FRONT-02, FRONT-03, FRONT-04, FRONT-05, FRONT-06, FRONT-07, FRONT-08, FRONT-09, FRONT-10, FRONT-11, SEARCH-03, SEARCH-04
**Success Criteria** (what must be TRUE):
  1. Every composable in `src/composables/queries/*.ts` and `src/composables/mutations/*.ts` imports from `@/lib/api/*`; no import references `@/lib/github/*`
  2. Logging in sets `useAuthStore` identity from `/me`; `isMaintainer` is derived from the `role` field returned by the API, not from a GitHub collaborators check
  3. `src/lib/github/etag.ts` is deleted; TanStack Query `staleTime` + standard HTTP cache headers govern freshness with no ETag logic in the client
  4. The Activity tab on a user profile page displays real activity data fetched from `/users/:login/activity` instead of the "coming soon" placeholder
  5. The MiniSearch client-side index is rebuilt from API responses and the service worker continues caching prompt list responses, so offline PWA browsing works without any network calls
**Plans**: TBD

### Phase 14: Admin & Moderation API
**Goal**: Maintainers can manage the moderation queue, view the moderation log, and perform label CRUD through Hono endpoints backed by D1; the frontend admin panel is rewired to these endpoints with role guards enforced server-side.
**Depends on**: Phase 13
**Requirements**: API-22, API-23, API-24, API-25, API-26, API-27, API-28
**Success Criteria** (what must be TRUE):
  1. A maintainer can fetch flagged prompts via `GET /admin/queue` and approve or hide them via `POST /admin/prompts/:id/approve` and `POST /admin/prompts/:id/hide`; actions are recorded in `moderation_log`
  2. `GET /admin/log` returns the full moderation history accessible only to maintainers; a non-maintainer JWT receives 403
  3. Label CRUD (`POST /labels`, `PATCH /labels/:id`, `DELETE /labels/:id`) allows maintainers to manage categories, models, and tags stored in D1
  4. All API error responses across the entire API surface use the consistent JSON error shape defined in API-27
  5. Every admin and write route rejects requests with missing or insufficient JWT (401/403) with no maintainer-check round-trip to GitHub
**Plans**: TBD

### Phase 15: Decommission & Docs
**Goal**: All v1 GitHub-Issues code paths are deleted from the codebase, the `prompt-community-data` repository is archived, and planning artifacts and product docs are updated to accurately reflect the v2 architecture.
**Depends on**: Phase 14
**Requirements**: DECOM-01, DECOM-02, DECOM-03, DECOM-04, DECOM-05, DECOM-06, DECOM-07, DECOM-08, DECOM-09, DECOM-10, DECOM-11, DECOM-12, DECOM-13, DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. The files `src/lib/github/octokit.ts`, `queries.ts`, `mutations.ts`, `etag.ts`, and `auth.ts` no longer exist in the repository; the codebase compiles cleanly with no dead imports
  2. The `prompt-community-data` GitHub repository is archived and `wrangler.toml` contains no references to the two-repo configuration
  3. The API worker is deployed to Cloudflare via `wrangler deploy`, production D1 is provisioned and migrated, and production secrets are configured — the app serves real traffic from the new backend
  4. Planning docs (`product-brief`, `prd.md`, `architecture.md`, `epics.md`) reflect the v2 architecture; the v1 research doc is marked historical with a superseded banner
  5. A developer with no prior context can set up the full local dev environment by following the updated `CONTRIBUTING.md` alone
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-15 |
| 2. Read & Contribute | v1.0 | 3/3 | Complete | 2026-03-15 |
| 3. Community & Profiles | v1.0 | 3/3 | Complete | 2026-03-15 |
| 4. Admin & PWA | v1.0 | 3/3 | Complete | 2026-03-25 |
| 5. Fix User Identity | v1.0 | 1/1 | Complete | 2026-03-26 |
| 6. Fix Command Palette & Admin Sidebar | v1.0 | 1/1 | Complete | 2026-03-26 |
| 7. Wire ETag Caching | v1.0 | 1/1 | Complete | 2026-03-26 |
| 8. Fix Admin & Search Tech Debt | v1.0 | 1/1 | Complete | 2026-03-26 |
| 9. Backend Foundation | 4/4 | Complete   | 2026-05-05 | - |
| 10. Auth Migration | 1/4 | In Progress|  | - |
| 11. Read API | v2.0 | 0/? | Not started | - |
| 12. Write API | v2.0 | 0/? | Not started | - |
| 13. Frontend Rewire | v2.0 | 0/? | Not started | - |
| 14. Admin & Moderation API | v2.0 | 0/? | Not started | - |
| 15. Decommission & Docs | v2.0 | 0/? | Not started | - |
