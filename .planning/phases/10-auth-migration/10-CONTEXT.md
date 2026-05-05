# Phase 10: Auth Migration - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the v1 GitHub token postMessage popup flow with a server-side OAuth → JWT exchange. The GitHub access token never reaches the browser. Session identity is delivered via HttpOnly cookie and read via `/me`. Dev-login endpoint enables offline development and E2E tests without a GitHub round-trip.

**In scope:**
- GitHub OAuth callback handler (server-side code exchange, UPSERT user, sign JWT, set cookie)
- JWT middleware: `requireAuth` (hard block) and `optionalAuth` (attaches user, does not block)
- `requireMaintainer` role guard using `users.role` from DB (replaces v1 GitHub collaborators API check)
- `GET /me` — returns authenticated user's `login`, `name`, `avatar_url`, `role`
- `POST /auth/dev-login` — mints JWT for seeded test user; conditionally registered when `ENV=dev` only
- Frontend `useAuthStore` rewired to hold no GitHub token; identity from `/me`
- Separate GitHub OAuth Apps for dev (localhost callback) and prod
- Popup window preserved; parent detects login via poll-on-close then calls `/me`

**Out of scope for Phase 10:**
- `POST /auth/logout` — deferred to Phase 13 (frontend rewire phase that calls it)
- All other API endpoints (Phases 11, 12, 14)
- Frontend composable rewire (Phase 13)

</domain>

<decisions>
## Implementation Decisions

### OAuth Popup Flow
- **Keep the popup UX** — do not switch to full-page redirect. User stays on the current page during login.
- Popup opens GitHub OAuth authorization URL; server handles the callback, sets the HttpOnly cookie, then redirects the popup to `/auth/callback` (a lightweight SPA route that calls `window.close()`).
- Parent detects login complete via **polling `popup.closed`** (`setInterval`). When closed, parent calls `GET /me` to load user state. No cross-origin postMessage required.
- The v1 postMessage pattern is removed entirely — the cookie is already set by the time the popup closes.

### Cookie Settings
- `HttpOnly + Secure + SameSite=Lax` (locked per PRD)
- Hard 7-day expiry — **no sliding window**. Active users on an internal tool re-authenticate every 7 days (acceptable friction).
- Cookie name: implementer's choice (e.g., `session` or `pc_session`) — apply consistently.

### JWT Claims
- `{ sub: users.id, role: 'user' | 'maintainer' }` — minimum per spec
- Additional claims (login, name, avatar) at implementer's discretion. Since `/me` is always called on load to verify auth, extra claims in JWT are optional.

### JWT Middleware (two variants)
- **`requireAuth`** — hard guard: verifies JWT from cookie; returns `401 { error: 'unauthorized', code: 'token_expired' | 'token_missing' }` if invalid or missing. Attaches user to `c.set('user', ...)` on success.
- **`optionalAuth`** — soft guard: attaches user to context if cookie is present and valid, but continues without blocking if cookie is absent or invalid. Used on public routes (e.g., `GET /prompts`) to enable user-specific data (reaction state, bookmark state) without requiring login.
- The `code` field distinguishes expired tokens from missing tokens — Phase 13 frontend can act on `token_expired` specifically (show toast + trigger logout).

### Role Guard
- **`requireMaintainer`** — checks `c.get('user')?.role === 'maintainer'`; returns `403 { error: 'forbidden' }` if not.
- `users.role` from the DB is the source of truth. The v1 GitHub collaborators API check is gone.

### dev-login Endpoint
- **Single endpoint:** `POST /auth/dev-login`
- **Request body:** `{ role?: 'user' | 'maintainer' }` — defaults to `'user'` if body is absent or role is not specified
- Mints a JWT for the corresponding seeded fixture user and sets the same HttpOnly cookie as real OAuth
- **Conditionally registered** — the route is only registered in the Hono app when `ENV === 'dev'`. In production the path literally does not exist (Hono returns 404 naturally). No runtime check needed inside the handler.
- **API-only** — no dev login UI page in the SPA. Intended for E2E test setup and CLI scripts. Developers use the real GitHub OAuth popup (dev OAuth App with localhost callback) for manual browser testing.

### Logout
- **Deferred to Phase 13.** No `POST /auth/logout` in Phase 10. The 7-day hard expiry means users in dev won't notice. Phase 13 adds the endpoint alongside the `useAuthStore` update that calls it.

### Claude's Discretion
- Exact cookie name (`session`, `pc_session`, etc.)
- JWT library choice (Hono has `hono/jwt`; implementer may use `jose` for more flexibility)
- Exact `/auth/callback` SPA route implementation (minimal — just call `window.close()`)
- OAuth state parameter storage in the popup flow (closure variable, sessionStorage, or cookie — pick one that's secure)
- Whether to add `iss` / `iat` claims beyond `sub` and `role`
- Exact polling interval for popup-closed detection (100–500ms is typical)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/workers/api/middleware/auth.ts` — `requireAuth` stub already scaffolded; Phase 10 fills it in
- `src/workers/api/middleware/role.ts` — `requireMaintainer` stub already scaffolded; Phase 10 fills it in
- `src/workers/api/routes/auth.ts` — stub route exists; Phase 10 replaces the catch-all 501 with real handlers
- `src/workers/api/index.ts` — CORS already configured with `credentials: true` and origin reflection; no changes needed for cookie flow
- `src/stores/useAuthStore.ts` — existing store to be rewired in Phase 10 (remove token ref, add /me call)
- `src/lib/github/auth.ts` — `verifyMaintainerStatus` — this function is replaced by `users.role` in Phase 10; can be deleted or marked for deletion in Phase 15

### Established Patterns
- v1 auth store uses `ref<string | null>` for token (in-memory, never localStorage) — Phase 10 removes the token ref entirely; identity comes from `/me` response
- v1 popup flow uses `window.addEventListener('message', handleMessage)` — Phase 10 replaces with `setInterval(() => { if (popup.closed) { fetchMe(); } }, 200)` pattern
- `Env` type in `src/workers/api/index.ts` already declares `JWT_SECRET?: string` — Phase 10 reads it as required (not optional)

### Integration Points
- `app.route('/auth', auth)` already registered in `index.ts` — Phase 10 fills in the handlers
- `DB: D1Database` binding available in all routes via Hono's `c.env.DB` — UPSERT to `users` table uses this
- `.dev.vars` already documents `JWT_SECRET` — Phase 10 is the first consumer
- Seed script already creates `dev-user` (role: user) and `dev-maintainer` (role: maintainer) — dev-login uses these fixtures

</code_context>

<specifics>
## Specific Ideas

- The popup polling pattern is preferred over postMessage: `const t = setInterval(() => { if (popup.closed) { clearInterval(t); void fetchMe() } }, 200)`
- The `/auth/callback` SPA route should be lightweight — a component that simply calls `window.close()` on mount (and shows a spinner in case close is delayed)
- `POST /auth/dev-login` with `{ role: 'maintainer' }` is the primary E2E test setup call — keep the request shape dead simple

</specifics>

<deferred>
## Deferred Ideas

- `POST /auth/logout` — deferred to Phase 13 (frontend rewire adds the call alongside `useAuthStore` update)
- Sliding JWT expiry / silent refresh — explicitly rejected for v2.0; 7-day hard expiry is sufficient for an internal tool
- Dev login UI page in the SPA — rejected; API-only is sufficient for E2E tests and scripts
- OAuth App upgrade to GitHub App — documented as a future path, explicitly out of v2.0 scope

</deferred>

---

*Phase: 10-auth-migration*
*Context gathered: 2026-05-05*
