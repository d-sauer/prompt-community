---
phase: 10-auth-migration
plan: "03"
subsystem: auth
tags: [hono, jwt, middleware, cloudflare-workers, vitest, tdd]

# Dependency graph
requires:
  - phase: 10-auth-migration-02
    provides: UserContext type, Env type with Bindings+Variables, D1 test migration infra, JWT signing in auth.ts
  - phase: 10-auth-migration-01
    provides: Failing test scaffolds for AUTH-05 through AUTH-08

provides:
  - "requireAuth(): MiddlewareHandler<Env> — 401 token_missing (no cookie), 401 token_expired (JwtTokenExpired), passes through with user set for valid JWT"
  - "optionalAuth(): MiddlewareHandler<Env> — never returns 401; sets user if valid cookie, null if not"
  - "requireMaintainer(): MiddlewareHandler<Env> — 403 for non-maintainer or missing user; passes through for maintainer"
  - "GET /me: 401 without auth, 200 { login, name, avatar_url, role } with valid cookie — no DB round-trip"
  - "POST /auth/dev-login: 200 + pc_session cookie in dev (ENV=dev), 404 in prod; fixture IDs for user/maintainer"

affects:
  - "10-auth-migration-04 (frontend auth store uses GET /me and POST /auth/dev-login)"
  - "All future route handlers (can now use requireAuth, optionalAuth, requireMaintainer)"

# Tech tracking
tech-stack:
  added:
    - "hono/jwt verify (HS256 JWT verification)"
    - "hono/cookie getCookie (HttpOnly cookie reading)"
    - "hono/utils/jwt/types JwtTokenExpired (instanceof check for expired token discrimination)"
  patterns:
    - "requireAuth: getCookie -> verify -> c.set('user', payload) -> next(); distinguishes expired vs invalid via instanceof JwtTokenExpired"
    - "optionalAuth: gracefully swallows all errors; always calls next()"
    - "requireMaintainer: reads c.get('user') set by requireAuth; 403 if null or role != maintainer"
    - "GET /me at top-level app (not under /auth prefix) — reads from c.get('user') set by requireAuth, no DB"
    - "POST /auth/dev-login: env-gated (ENV=dev); fixture IDs for user/maintainer; same sign+setCookie pattern as callback"

key-files:
  created: []
  modified:
    - "src/workers/api/middleware/auth.ts"
    - "src/workers/api/middleware/role.ts"
    - "src/workers/api/routes/auth.ts"
    - "src/workers/api/index.ts"

key-decisions:
  - "JwtTokenExpired from 'hono/utils/jwt/types' used for instanceof check to discriminate expired vs invalid tokens — verified in node_modules/hono@4.12.17"
  - "GET /me mounted at top-level app (not auth router) so URL is /me not /auth/me"
  - "POST /auth/dev-login: c.notFound() returns 404 when ENV !== 'dev'"

requirements-completed: [AUTH-05, AUTH-06, AUTH-07, AUTH-08]

# Metrics
duration: 4min
completed: 2026-05-06
---

# Phase 10 Plan 03: Auth Middleware + /me + dev-login Summary

**JWT auth middleware (requireAuth, optionalAuth, requireMaintainer) + GET /me + POST /auth/dev-login endpoint, completing the entire server-side auth surface**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-06T04:25:22Z
- **Completed:** 2026-05-06T04:29:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Implemented `requireAuth()` middleware: 401 with `code: 'token_missing'` (no cookie or invalid JWT), 401 with `code: 'token_expired'` (expired JWT via `instanceof JwtTokenExpired`), passes through with `c.set('user', ...)` for valid JWT
- Implemented `optionalAuth()` middleware: never blocks; sets user from valid cookie or null on missing/invalid/expired
- Implemented `requireMaintainer()` middleware: 403 for null user or role != 'maintainer'; passes through for maintainer
- Added `GET /me` at top-level app (`/me` not `/auth/me`): reads from `c.get('user')` set by requireAuth; no DB round-trip; returns `{ login, name, avatar_url, role }`
- Added `POST /auth/dev-login` to auth router: env-gated (`ENV === 'dev'`); mints JWT for fixture users (01DEVUSER/01DEVMAINT); sets `pc_session` cookie; returns 404 in prod

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement requireAuth, optionalAuth, requireMaintainer** - `a84d6dc` (feat)
2. **Task 2: Add GET /me and POST /auth/dev-login** - `077a503` (feat)

## Files Created/Modified

- `src/workers/api/middleware/auth.ts` — Full implementation replacing pass-through stub; imports `verify`, `getCookie`, `JwtTokenExpired`
- `src/workers/api/middleware/role.ts` — Full implementation replacing pass-through stub
- `src/workers/api/routes/auth.ts` — Added `POST /auth/dev-login` handler before catch-all
- `src/workers/api/index.ts` — Imported `requireAuth`; added `app.get('/me', requireAuth(), handler)` at top level

## Decisions Made

- **JwtTokenExpired instanceof check:** `import { JwtTokenExpired } from 'hono/utils/jwt/types'` works at runtime in hono@4.12.17; used for discriminating `code: 'token_expired'` vs `code: 'token_missing'` in catch block
- **GET /me at top level:** Mounted as `app.get('/me', ...)` in `index.ts` so the URL is `/me` not `/auth/me`, per plan spec
- **POST /auth/dev-login guard:** `c.notFound()` (returns 404) when `c.env.ENV !== 'dev'`; catch-all at `auth.all('*')` still handles unknown auth paths

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- `npm run test:workers`: 27/27 tests PASS (4 test files)
  - `auth.spec.ts` (AUTH-05a, AUTH-05b, AUTH-05c, optionalAuth no cookie, optionalAuth valid): GREEN
  - `role.spec.ts` (AUTH-06a, AUTH-06b, AUTH-06c): GREEN
  - `routes/auth.spec.ts` (AUTH-07 x2, AUTH-08 x3, plus AUTH-01 through AUTH-04, AUTH-09): GREEN
  - `index.spec.ts` (boot tests): GREEN
- `src/stores/useAuthStore.spec.ts` (jsdom): 10 failing — pre-existing RED scaffold for AUTH-10 (next plan); not caused by this plan's changes (confirmed via stash)

## Next Phase Readiness

- `requireAuth` and `optionalAuth` are ready for any route handler to import and use
- `requireMaintainer` guards admin/maintainer routes
- `GET /me` endpoint ready for frontend to call on startup to load user identity
- `POST /auth/dev-login` enables airplane-mode dev without GitHub round-trip

---
*Phase: 10-auth-migration*
*Completed: 2026-05-06*
