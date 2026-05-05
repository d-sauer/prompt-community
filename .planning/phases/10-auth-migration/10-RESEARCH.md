# Phase 10: Auth Migration - Research

**Researched:** 2026-05-05
**Domain:** GitHub OAuth, JWT session cookies, Hono middleware, Drizzle ORM UPSERT, Vue Pinia store
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**OAuth Popup Flow**
- Keep the popup UX — do not switch to full-page redirect.
- Popup opens GitHub OAuth authorization URL; server handles the callback, sets the HttpOnly cookie, then redirects the popup to `/auth/callback` (a lightweight SPA route that calls `window.close()`).
- Parent detects login complete via polling `popup.closed` (`setInterval`). When closed, parent calls `GET /me` to load user state.
- The v1 postMessage pattern is removed entirely.

**Cookie Settings**
- `HttpOnly + Secure + SameSite=Lax` (locked per PRD).
- Hard 7-day expiry — no sliding window.
- Cookie name: implementer's choice (e.g., `session` or `pc_session`) — apply consistently.

**JWT Claims**
- `{ sub: users.id, role: 'user' | 'maintainer' }` — minimum per spec.
- Additional claims (login, name, avatar) at implementer's discretion.

**JWT Middleware (two variants)**
- `requireAuth` — hard guard: returns `401 { error: 'unauthorized', code: 'token_expired' | 'token_missing' }` if invalid or missing. Attaches user to `c.set('user', ...)` on success.
- `optionalAuth` — soft guard: attaches user to context if valid, continues without blocking if absent/invalid.
- The `code` field distinguishes expired tokens from missing tokens.

**Role Guard**
- `requireMaintainer` — checks `c.get('user')?.role === 'maintainer'`; returns `403 { error: 'forbidden' }`.
- `users.role` from DB is source of truth. GitHub collaborators API check is gone.

**dev-login Endpoint**
- Single endpoint: `POST /auth/dev-login`.
- Request body: `{ role?: 'user' | 'maintainer' }` — defaults to `'user'` if absent.
- Mints a JWT for the corresponding seeded fixture user, sets the same HttpOnly cookie as real OAuth.
- Conditionally registered — route only registered when `ENV === 'dev'`. Hono returns 404 naturally in production.
- API-only — no dev login UI page.

**Logout**
- Deferred to Phase 13. No `POST /auth/logout` in Phase 10.

### Claude's Discretion
- Exact cookie name (`session`, `pc_session`, etc.)
- JWT library choice (Hono has `hono/jwt`; implementer may use `jose` for more flexibility)
- Exact `/auth/callback` SPA route implementation (minimal — just call `window.close()`)
- OAuth state parameter storage in the popup flow (closure variable, sessionStorage, or cookie — pick one that's secure)
- Whether to add `iss` / `iat` claims beyond `sub` and `role`
- Exact polling interval for popup-closed detection (100–500ms is typical)

### Deferred Ideas (OUT OF SCOPE)
- `POST /auth/logout` — deferred to Phase 13
- Sliding JWT expiry / silent refresh — explicitly rejected; 7-day hard expiry is sufficient
- Dev login UI page in the SPA — rejected; API-only
- OAuth App upgrade to GitHub App — future path, out of v2.0 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | OAuth callback worker exchanges GitHub code for access token server-side (token never reaches browser) | GitHub token endpoint, Hono route handler pattern |
| AUTH-02 | OAuth callback UPSERTs user into `users` table by `github_id` (sets `login`, `name`, `avatar_url`, `role`) | Drizzle `onConflictDoUpdate` with `github_id` target |
| AUTH-03 | OAuth callback signs HS256 JWT with `{ sub, role }` claims and 7-day expiry | `hono/jwt` `sign()` — verified in local `node_modules` |
| AUTH-04 | Session JWT delivered via `HttpOnly + Secure + SameSite=Lax` cookie | `setCookie()` from `hono/cookie` — options confirmed |
| AUTH-05 | API middleware verifies JWT on every protected request and attaches user to context | `requireAuth` middleware — stub already scaffolded |
| AUTH-06 | `users.role` replaces GitHub collaborators API maintainer check | `requireMaintainer` middleware — stub already scaffolded |
| AUTH-07 | `GET /me` returns current user including `role` flag | New route handler, reads `c.get('user')` set by `requireAuth` |
| AUTH-08 | `POST /auth/dev-login` mints JWT for seeded test user, gated by `ENV === 'dev'`, returns 404 in prod | Conditional route registration pattern in Hono |
| AUTH-09 | GitHub OAuth scope reduced from `public_repo` to `read:user user:email` | Scope param in authorization URL |
| AUTH-10 | Frontend `useAuthStore` holds no GitHub token; identity from `/me` | Pinia store rewrite — existing store identified |
| DEV-04 | Separate GitHub OAuth Apps for dev (localhost callback) and prod | Configuration — not code; documented in CONTRIBUTING.md |
</phase_requirements>

---

## Summary

Phase 10 replaces the v1 browser-side GitHub token postMessage flow with a fully server-side OAuth exchange. The key insight is that `hono/jwt` and `hono/cookie` (both confirmed present in `node_modules/hono@4.12.17`) provide all the primitives needed without any additional dependencies. The GitHub access token is exchanged server-side in the OAuth callback handler, a first-party HS256 JWT is minted, and delivered as an HttpOnly cookie — the token never touches the browser.

Three scaffolded stubs are ready to fill in: `src/workers/api/middleware/auth.ts` (`requireAuth`), `src/workers/api/middleware/role.ts` (`requireMaintainer`), and `src/workers/api/routes/auth.ts` (currently returns 501 for all routes). The `Env` type already declares `JWT_SECRET?: string`; Phase 10 treats it as required. Drizzle ORM's `onConflictDoUpdate` handles the user UPSERT on `github_id`. The Hono `Env` type needs a `Variables` extension to type `c.set('user', ...)`.

On the frontend, `useAuthStore` currently holds a `ref<string | null>` token and calls GitHub's GraphQL API — both are replaced by a `GET /me` call and identity stored as a plain user object. The popup mechanism switches from `window.addEventListener('message', ...)` to a `setInterval(() => { if (popup.closed) … }, 200)` pattern with no postMessage required.

**Primary recommendation:** Use `hono/jwt` `sign`/`verify` directly (no additional JWT library needed). Use `setCookie`/`getCookie` from `hono/cookie`. Extend the `Env` type with a `Variables` block to get type-safe `c.get('user')`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hono` | `^4.12.17` | Web framework + JWT + cookie utilities | Already in project; `hono/jwt` and `hono/cookie` are built-in |
| `drizzle-orm` | `^0.45.2` | UPSERT `users` by `github_id` | Already in project; `onConflictDoUpdate` handles the upsert |
| Cloudflare D1 (`c.env.DB`) | (platform) | Persist and look up users | Already bound in `wrangler.toml` |
| `@cloudflare/workers-types` | `^4.20260505.1` | TypeScript types for D1, crypto | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hono/cookie` (built-in) | same as hono | `getCookie`, `setCookie` with full options | Setting the HttpOnly session cookie |
| `hono/jwt` (built-in) | same as hono | `sign`, `verify` (HS256) | Mint and verify the JWT |
| Web Crypto API | (platform) | Used internally by `hono/jwt` | Available in workerd; no polyfill needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `hono/jwt` (built-in) | `jose` npm package | `jose` supports RSA/EC and JWKS, but adds a dependency. HS256 with `hono/jwt` is sufficient for this scope |
| Poll-on-close | Cross-origin `postMessage` | postMessage requires the same origin or an explicit `targetOrigin`; polling is simpler with an HttpOnly cookie flow |

**Installation:** No new packages required — all needed utilities are built into `hono@4.12.17` which is already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/workers/api/
├── index.ts                  # Env type + Variables type — add Variables block
├── middleware/
│   ├── auth.ts               # requireAuth + optionalAuth (fill in stub)
│   └── role.ts               # requireMaintainer (fill in stub)
└── routes/
    └── auth.ts               # Replace 501 stub with real handlers

src/
└── stores/
    └── useAuthStore.ts       # Rewrite: remove token ref, add /me call, polling popup

src/
└── views/ (or router)
    └── AuthCallback.vue      # New lightweight SPA route — calls window.close()
```

### Pattern 1: Hono Env + Variables Type Extension

The existing `Env` type in `src/workers/api/index.ts` only covers `Bindings`. To get type-safe `c.set('user', ...)` and `c.get('user')`, add a `Variables` block:

```typescript
// Source: hono node_modules — types/types.d.ts Variables field
export type UserContext = {
  id: string
  role: 'user' | 'maintainer'
  login: string
}

export type Env = {
  Bindings: {
    DB: D1Database
    ENV: string
    APP_ORIGIN: string
    GITHUB_CLIENT_ID?: string
    GITHUB_CLIENT_SECRET?: string
    JWT_SECRET?: string
  }
  Variables: {
    user: UserContext | null
  }
}
```

Note: the existing `index.ts` uses `Env` as `Hono<{ Bindings: Env }>` — the flat `Env` type must be refactored to use the nested `{ Bindings, Variables }` shape. This is a CRITICAL structural change that affects how all route files import `Env`.

### Pattern 2: JWT Sign and Cookie Set (OAuth Callback)

```typescript
// Source: hono/dist/utils/jwt/jwt.js (verified in node_modules)
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7

const token = await sign(
  {
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SEVEN_DAYS_SECONDS,
  },
  c.env.JWT_SECRET!,
  'HS256'
)

setCookie(c, 'pc_session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  maxAge: SEVEN_DAYS_SECONDS,
  path: '/',
})
```

### Pattern 3: JWT Verify in requireAuth Middleware

```typescript
// Source: hono/dist/utils/jwt/jwt.js (verified) + hono/dist/helper/cookie/index.js (verified)
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'

export const requireAuth = (): MiddlewareHandler<Env> => async (c, next) => {
  const token = getCookie(c, 'pc_session')
  if (!token) {
    return c.json({ error: 'unauthorized', code: 'token_missing' }, 401)
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET!, 'HS256')
    c.set('user', { id: payload.sub as string, role: payload.role as 'user' | 'maintainer', login: payload.login as string })
    await next()
  } catch (e) {
    const code = (e as Error).constructor?.name === 'JwtTokenExpired' ? 'token_expired' : 'token_missing'
    return c.json({ error: 'unauthorized', code }, 401)
  }
}
```

`JwtTokenExpired` is a named class exported from `hono/dist/utils/jwt/types.js`. Import it as `import { JwtTokenExpired } from 'hono/utils/jwt/types'` or check `instanceof` via the import. Alternatively use string match on `e.message`.

### Pattern 4: Drizzle UPSERT on github_id

```typescript
// Source: drizzle-orm sqlite-core query-builders/insert.d.ts (verified in node_modules)
import { drizzle } from 'drizzle-orm/d1'
import { users } from '../db/schema'

const db = drizzle(c.env.DB)

await db
  .insert(users)
  .values({
    github_id: githubUser.id,
    github_login: githubUser.login,
    name: githubUser.name ?? null,
    avatar_url: githubUser.avatar_url ?? null,
    role: 'user', // default; never downgrade an existing role
  })
  .onConflictDoUpdate({
    target: users.github_id,
    set: {
      github_login: githubUser.login,
      name: githubUser.name ?? null,
      avatar_url: githubUser.avatar_url ?? null,
      // role NOT updated — preserve existing role on login
    },
  })
  .returning()
```

CRITICAL: Do not update `role` in the `set` block. If an admin grants `maintainer` role directly in the DB, the next login must not reset it to `'user'`.

### Pattern 5: GitHub OAuth Server-Side Code Exchange

GitHub OAuth token endpoint (confirmed, standard):
```
POST https://github.com/login/oauth/access_token
Content-Type: application/json
Accept: application/json

{ client_id, client_secret, code, redirect_uri }
```

Response: `{ access_token, token_type, scope }` — or `{ error }` on failure.

Then fetch user info:
```
GET https://api.github.com/user
Authorization: Bearer <access_token>
```

Response: `{ id, login, name, avatar_url, ... }`

The GitHub `code` is single-use and expires in 10 minutes. It must be exchanged server-side — the browser callback page only sees a redirect URL, the browser never holds the access token.

### Pattern 6: Conditional Route Registration

```typescript
// Hono conditional registration — ENV check at startup
const app = new Hono<{ Bindings: Env }>()

// ... normal routes ...

// dev-login: registered ONLY when ENV === 'dev'
// In production ENV is not 'dev', this block never executes,
// so Hono naturally returns 404 for POST /auth/dev-login.
if (/* ENV check */ /* must be runtime check inside handler */) { ... }
```

IMPORTANT: `ENV` is a runtime binding, not available at module load time in Cloudflare Workers. The conditional registration must use a middleware check approach or check `c.env.ENV` inside the handler and return 404 explicitly. The CONTEXT.md says "the route is only registered when `ENV === 'dev'`" — in Cloudflare Workers the `[vars]` section in `wrangler.toml` sets `ENV = "dev"` at build time for dev. For production, a different value would be set. The safe pattern: register the route, but return 404 inside the handler if `c.env.ENV !== 'dev'`. The net effect is identical to not registering it.

### Pattern 7: Frontend Popup Polling

```typescript
// src/stores/useAuthStore.ts — replace window.addEventListener('message', ...) 
function login() {
  const apiUrl = import.meta.env.VITE_API_URL as string
  const popup = window.open(
    `${apiUrl}/auth/login`,
    'github-oauth',
    'width=600,height=700,scrollbars=yes',
  )
  if (!popup) return

  const t = setInterval(() => {
    if (popup.closed) {
      clearInterval(t)
      void fetchMe()
    }
  }, 200)
}

async function fetchMe(): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
    credentials: 'include',  // sends the HttpOnly cookie
  })
  if (res.ok) {
    const data = await res.json() as { login: string; name: string | null; avatar_url: string; role: 'user' | 'maintainer' }
    user.value = data
    isMaintainer.value = data.role === 'maintainer'
  }
}
```

### Anti-Patterns to Avoid

- **Setting `JWT_SECRET` as optional in `Env`:** The existing code has `JWT_SECRET?: string`. Phase 10 must treat it as required — throw at startup if missing, not silently produce unsigned tokens.
- **Updating `role` in UPSERT set block:** Once a user is granted `maintainer` in the DB, every login would reset them to `'user'`. Never write `role` in `onConflictDoUpdate.set`.
- **Using `hono/middleware/jwt` (the pre-built middleware):** That middleware reads from `Authorization` header by default; it can read from cookie with `options.cookie` but throws `HTTPException` without the custom `code` field required by spec. Write `requireAuth` manually for full control over error shape.
- **Storing the OAuth state in `sessionStorage` for popup flow:** `sessionStorage` is per-tab; the popup has a different tab context. Use a closure variable (already the approach in existing v1 code) or a short-lived cookie.
- **Returning the GitHub access token in any response body:** The entire point of server-side exchange is that the token stays server-side; it is never serialized to a response.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HS256 JWT sign/verify | Custom crypto | `hono/jwt` `sign`/`verify` | Handles base64url encoding, header construction, timing-safe compare |
| Cookie serialization with attributes | String concatenation | `setCookie` from `hono/cookie` | Handles SameSite, HttpOnly, Secure, Max-Age, Path correctly |
| GitHub code exchange | Manual fetch + error handling | Standard `fetch` to `github.com/login/oauth/access_token` with `Accept: application/json` | Simple enough to do directly; no library needed |
| UPSERT on unique column | SELECT then INSERT/UPDATE | Drizzle `onConflictDoUpdate` | Atomic, no race condition |

**Key insight:** The Hono JWT utilities use `crypto.subtle` (Web Crypto API) which is available in Cloudflare Workers natively — no Node.js polyfills or special imports needed.

---

## Common Pitfalls

### Pitfall 1: Flat `Env` type vs Nested `{ Bindings, Variables }`

**What goes wrong:** The existing `Env` type is flat: `export type Env = { DB: D1Database; ... }`. Route files import it as `Hono<{ Bindings: Env }>`. Adding `c.set('user', ...)` requires a `Variables` field on the second generic parameter of the `Env` object (`{ Bindings: {...}, Variables: {...} }`). The current shape will cause TypeScript errors when `c.set` is called with unknown keys.

**Why it happens:** Phase 9 scaffolded the type for bindings only. Middleware variable context was deferred to Phase 10.

**How to avoid:** Refactor `Env` to: `export type Env = { Bindings: { DB: D1Database; ... }; Variables: { user: UserContext | null } }`. Update all route files that currently do `Hono<{ Bindings: Env }>` to `Hono<Env>`. This is a breaking change across all route stubs.

**Warning signs:** TypeScript error "Argument of type 'string' is not assignable to parameter" when calling `c.set('user', ...)`.

### Pitfall 2: JWT Secret Not Available at Module Load

**What goes wrong:** Trying to pre-load or validate `JWT_SECRET` at module scope (`const secret = env.JWT_SECRET`) fails because Cloudflare Worker bindings are only available inside request handlers.

**Why it happens:** The Worker runtime initializes bindings per-request context, not at module load time.

**How to avoid:** Always access `c.env.JWT_SECRET` inside a handler or middleware function, not at module scope. Throw a meaningful error if `!c.env.JWT_SECRET` inside the handler.

### Pitfall 3: `Secure` Cookie Attribute in Dev (localhost)

**What goes wrong:** `Secure` cookie attribute means the browser only sends the cookie over HTTPS. `localhost` is an exception — browsers treat `http://localhost` as secure for `Secure` cookies. But if using a custom dev hostname (not `localhost`), cookies will not be sent.

**Why it happens:** Spec says Secure = HTTPS only, but major browsers exempt `localhost`.

**How to avoid:** Always use `localhost` in dev, not `127.0.0.1` or a custom hostname. The `wrangler dev` default binding is `localhost:8787`.

### Pitfall 4: `SameSite=Lax` and Cross-Origin in Dev

**What goes wrong:** Frontend on `:5173`, API on `:8787` — different ports = different origins. `SameSite=Lax` means the cookie is sent on top-level navigations and GET requests, but is sent on cross-origin POST/PATCH requests only if the site's "registrable domain" matches. On localhost different ports are considered same-site, so `SameSite=Lax` works for dev. In production, if the SPA and API are on different domains, `SameSite=Lax` will block cookies.

**Why it happens:** `SameSite=Lax` is per-registrable-domain, not per-origin. `localhost:5173` and `localhost:8787` share registrable domain `localhost`.

**How to avoid:** Confirm that in production the SPA and API share the same registrable domain (e.g., `*.example.com`). If on fully different domains, `SameSite=None; Secure` would be required (and CORS must allow credentials — already set in `index.ts`).

### Pitfall 5: GitHub OAuth State Parameter in Popup Context

**What goes wrong:** If state is stored in `sessionStorage`, the popup window has a different `sessionStorage` than the parent. When the callback redirects back, the parent can't verify state from its own sessionStorage.

**Why it happens:** `sessionStorage` is tab-scoped, not shared across popup windows.

**How to avoid:** Store the `state` value in a closure variable in the parent (as v1 code already does with `const state = crypto.randomUUID()`). The callback handler on the server validates state against what it stored (e.g., in a short-lived cookie or by embedding the state in the redirect URL to the SPA).

### Pitfall 6: `onConflictDoUpdate` Target Must Match a Unique Index

**What goes wrong:** If the `.target` column is not declared `UNIQUE` in the schema, Drizzle/SQLite throws a runtime error.

**Why it happens:** SQLite `ON CONFLICT` requires a conflict target column with a UNIQUE constraint.

**How to avoid:** `users.github_id` is declared `integer('github_id').notNull().unique()` in `schema.ts` — confirmed safe to use as conflict target.

### Pitfall 7: `hono/jwt` `JwtTokenExpired` Error Detection

**What goes wrong:** The `code: 'token_expired'` vs `code: 'token_missing'` distinction requires detecting which specific error `verify()` threw. `hono/jwt` throws typed error classes from `hono/utils/jwt/types`.

**Why it happens:** The error classes are internal to Hono and not re-exported from the main `hono/jwt` entry.

**How to avoid:** Check error message string or import the error class directly:
```typescript
import { JwtTokenExpired } from 'hono/utils/jwt/types'
// then: catch (e) { if (e instanceof JwtTokenExpired) ... }
```
Alternatively, catch and inspect `(e as Error).name` or message. The simpler approach is checking `(e as Error).message?.includes('expired')`.

---

## Code Examples

### GitHub OAuth Authorization URL Construction

```typescript
// Source: GitHub OAuth docs (standard, unchanged since 2012)
const params = new URLSearchParams({
  client_id: c.env.GITHUB_CLIENT_ID!,
  redirect_uri: `${new URL(c.req.url).origin}/auth/callback`,
  scope: 'read:user user:email',  // AUTH-09: reduced scope
  state,  // CSRF protection — stored in closure/cookie
})
const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`
return c.redirect(authUrl)
```

### GitHub Token Exchange

```typescript
// Server-side code → token exchange (never reaches browser)
const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify({
    client_id: c.env.GITHUB_CLIENT_ID!,
    client_secret: c.env.GITHUB_CLIENT_SECRET!,
    code,
    redirect_uri: `${new URL(c.req.url).origin}/auth/callback`,
  }),
})
const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
if (!tokenData.access_token) {
  return c.json({ error: 'oauth_failed' }, 400)
}
```

### Fetch GitHub User Info

```typescript
const userRes = await fetch('https://api.github.com/user', {
  headers: {
    Authorization: `Bearer ${tokenData.access_token}`,
    'User-Agent': 'prompt-community-api',  // Required by GitHub API
    Accept: 'application/vnd.github.v3+json',
  },
})
const githubUser = await userRes.json() as {
  id: number; login: string; name: string | null; avatar_url: string
}
```

### GET /me Handler

```typescript
// Reads from c.get('user') set by requireAuth middleware
app.get('/me', requireAuth(), (c) => {
  const user = c.get('user')!
  return c.json({
    login: user.login,
    name: user.name,
    avatar_url: user.avatar_url,
    role: user.role,
  })
})
```

The `UserContext` type stored in Variables must include `login`, `name`, `avatar_url`, `role` — or `/me` must do a DB lookup by `user.id`. Since `/me` is called on every app load, keeping `login`/`name`/`avatar_url` in the JWT payload (and therefore in `UserContext`) avoids a DB round-trip.

### dev-login Handler (ENV-gated)

```typescript
// Route registered unconditionally; handler gates on ENV
app.post('/dev-login', async (c) => {
  if (c.env.ENV !== 'dev') {
    return c.notFound()  // Returns 404
  }
  const body = await c.req.json<{ role?: 'user' | 'maintainer' }>().catch(() => ({}))
  const role = body?.role === 'maintainer' ? 'maintainer' : 'user'
  const fixtureId = role === 'maintainer'
    ? '01DEVMAINT00000000000000001'
    : '01DEVUSER000000000000000001'
  const fixtureLogin = role === 'maintainer' ? 'dev-maintainer' : 'dev-user'

  const token = await sign(
    { sub: fixtureId, role, login: fixtureLogin, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
    c.env.JWT_SECRET!,
    'HS256'
  )
  setCookie(c, 'pc_session', token, {
    httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 60 * 60 * 24 * 7, path: '/',
  })
  return c.json({ ok: true, role })
})
```

Seed fixture IDs from `scripts/seed.sql`:
- `'01DEVUSER000000000000000001'` — github_login: `dev-user`, role: `user`
- `'01DEVMAINT00000000000000001'` — github_login: `dev-maintainer`, role: `maintainer`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub token in-memory (`ref<string>`) + postMessage | HttpOnly cookie JWT + poll-on-close | Phase 10 | Token never touches browser; XSS-resistant |
| GitHub collaborators API for maintainer check | `users.role` from DB | Phase 10 | No GitHub API dependency at runtime; faster |
| `public_repo` OAuth scope | `read:user user:email` | Phase 10 (AUTH-09) | Least-privilege; no repo access |
| v1 popup: `window.addEventListener('message', ...)` | `setInterval(() => popup.closed && fetchMe(), 200)` | Phase 10 | Eliminates cross-origin postMessage dependency |

**Deprecated/outdated in this phase:**
- `src/lib/github/auth.ts` `verifyMaintainerStatus`: marked for deletion in Phase 15 (but can be removed in Phase 10 since it's only called from `useAuthStore`)
- `useAuthStore` `token` ref, `receiveToken`, `fetchCurrentUser(token)` pattern: replaced by cookie + `/me` poll
- `window.addEventListener('message', handleMessage)` in `useAuthStore.login()`: removed

---

## Open Questions

1. **`/auth/callback` SPA route — router registration**
   - What we know: A lightweight Vue component that calls `window.close()` on mount is needed
   - What's unclear: Whether `vue-router` already has a catch-all or if a new named route needs adding
   - Recommendation: Add a named route `/auth/callback` to the SPA router that renders a minimal "Logging in..." component that calls `window.close()` on `onMounted`

2. **OAuth state CSRF validation in server callback**
   - What we know: State is generated in the parent window closure; the popup's server callback receives it as a query param
   - What's unclear: The server callback needs to verify state — but since the state is a closure variable in the browser, the server can't verify it against anything unless it's also stored server-side (e.g., short-lived cookie set on `/auth/login` and verified in `/auth/callback`)
   - Recommendation: Set a `oauth_state` cookie with `SameSite=Lax; HttpOnly; MaxAge=300` on the `/auth/login` redirect, then verify `?state=` against cookie value in the callback handler and delete the cookie. This is the standard server-side CSRF pattern.

3. **`UserContext` Variables type fields**
   - What we know: `c.get('user')` must return enough to serve `GET /me` without a DB round-trip
   - What's unclear: Whether to store `name` and `avatar_url` in the JWT (slightly larger cookie) or always DB-look up in `/me`
   - Recommendation: Include `login`, `name`, `avatar_url`, `role` in JWT payload and `UserContext`. JWT size overhead is negligible (~50 bytes). Avoids DB per-request for `/me`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest `^4.1.0` + `@cloudflare/vitest-pool-workers ^0.15.2` |
| Config file | `vitest.workers.config.ts` (for worker tests) |
| Quick run command | `npm run test:workers` |
| Full suite command | `npm run test:workers && npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | OAuth callback exchanges code server-side, token not in response body | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-02 | UPSERT inserts new user on first login; updates profile on subsequent login | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-03 | JWT has HS256 alg, `sub` = user.id, `role` claim, 7-day exp | unit | `npm run test:workers` | ❌ Wave 0 |
| AUTH-04 | Response has `Set-Cookie` header with HttpOnly, Secure, SameSite=Lax | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-05 | Protected route returns 401 with `code: 'token_missing'` when no cookie | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-05 | Protected route returns 401 with `code: 'token_expired'` for expired JWT | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-06 | Non-maintainer user gets 403 on maintainer-only route | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-07 | `GET /me` returns `login`, `name`, `avatar_url`, `role` for authenticated user | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-08 | `POST /auth/dev-login` returns cookie + 200 in dev; returns 404 in prod | integration | `npm run test:workers` | ❌ Wave 0 |
| AUTH-09 | Authorization URL includes `scope=read:user+user:email` | unit | `npm run test:workers` | ❌ Wave 0 |
| AUTH-10 | Frontend `useAuthStore` has no `token` ref; calls `/me` on popup close | unit (jsdom) | `npm run test` | ❌ Wave 0 |
| DEV-04 | Separate OAuth Apps documented; `GITHUB_CLIENT_ID` switches via env var | manual | — | manual only |

**Note on AUTH-01:** The OAuth callback handler makes external HTTP calls to `github.com`. In tests these must be mocked using `vi.mock` or the `fetchMock` pattern available in `@cloudflare/vitest-pool-workers`.

### Sampling Rate
- **Per task commit:** `npm run test:workers`
- **Per wave merge:** `npm run test:workers && npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/workers/api/routes/auth.spec.ts` — covers AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07, AUTH-08, AUTH-09
- [ ] `src/workers/api/middleware/auth.spec.ts` — covers AUTH-05 (token_missing, token_expired)
- [ ] `src/workers/api/middleware/role.spec.ts` — covers AUTH-06
- [ ] `src/stores/useAuthStore.spec.ts` (update existing) — covers AUTH-10

---

## Sources

### Primary (HIGH confidence)
- `node_modules/hono@4.12.17/dist/utils/jwt/jwt.js` — `sign`, `verify` API confirmed locally
- `node_modules/hono@4.12.17/dist/helper/cookie/index.js` — `setCookie`, `getCookie` options confirmed locally
- `node_modules/hono@4.12.17/dist/middleware/jwt/jwt.js` — cookie option shape confirmed locally
- `node_modules/drizzle-orm@0.45.2/sqlite-core/query-builders/insert.d.ts` — `onConflictDoUpdate` signature confirmed locally
- `src/workers/api/db/schema.ts` — `users.github_id` UNIQUE constraint confirmed
- `scripts/seed.sql` — fixture user IDs confirmed
- `.dev.vars.example` — `JWT_SECRET` variable name confirmed
- `src/workers/api/index.ts` — existing `Env` type structure confirmed
- `src/stores/useAuthStore.ts` — v1 token ref and postMessage pattern confirmed

### Secondary (MEDIUM confidence)
- GitHub OAuth Apps documentation — standard OAuth 2.0 code flow, `github.com/login/oauth/authorize` and `access_token` endpoints
- GitHub API docs — `GET /user` endpoint returning `id`, `login`, `name`, `avatar_url`
- Cloudflare Workers `SameSite` cookie behavior on localhost (well-documented in browser specs)

### Tertiary (LOW confidence)
- None — all critical claims verified from local source code or well-established specs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in local `node_modules`
- Architecture: HIGH — stub files read directly; patterns verified against Hono source
- Pitfalls: HIGH — most confirmed from code inspection; cookie SameSite behavior is from browser spec
- Test patterns: HIGH — existing `index.spec.ts` pattern gives exact test structure to replicate

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (Hono and drizzle-orm are stable; GitHub OAuth endpoints unchanged since 2012)
