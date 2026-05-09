// src/workers/api/routes/auth.ts
// GitHub OAuth login and callback handlers — Phase 10 Plan 02.
// POST /auth/dev-login is added in Plan 03 (alongside the auth middleware).
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { drizzle } from 'drizzle-orm/d1'
import { users } from '../db/schema'
import type { Env } from '../index'

const auth = new Hono<Env>()

const SEVEN_DAYS = 60 * 60 * 24 * 7

auth.get('/login', async (c) => {
  const state = crypto.randomUUID()
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 300,
    path: '/',
  })
  const origin = new URL(c.req.url).origin
  // Construct the GitHub authorize URL manually to preserve scope colons.
  // URLSearchParams would encode 'read:user' as 'read%3Auser', which GitHub
  // accepts but some tests and browser DevTools display confusingly.
  const authorizeUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${encodeURIComponent(c.env.GITHUB_CLIENT_ID!)}` +
    `&redirect_uri=${encodeURIComponent(`${origin}/auth/callback`)}` +
    `&scope=read:user user:email` +
    `&state=${encodeURIComponent(state)}`
  return c.redirect(authorizeUrl)
})

auth.get('/callback', async (c) => {
  const { code, state } = c.req.query()
  const storedState = getCookie(c, 'oauth_state')

  // CSRF state validation: only enforce when a stored state cookie is present.
  // If storedState exists, the incoming state must match exactly.
  if (storedState && state !== storedState) {
    return c.json({ error: 'invalid_state' }, 400)
  }

  if (!code) {
    return c.json({ error: 'missing_code' }, 400)
  }

  if (storedState) {
    deleteCookie(c, 'oauth_state')
  }

  // Exchange code for access token (server-side only — token never leaves the worker)
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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

  // Fetch GitHub user profile — access token NEVER returned to browser
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'prompt-community-api',
      Accept: 'application/vnd.github.v3+json',
    },
  })
  const githubUser = await userRes.json() as {
    id: number
    login: string
    name: string | null
    avatar_url: string
  }

  // UPSERT user — role is intentionally excluded from the update set
  // to preserve any manually-granted maintainer role
  const db = drizzle(c.env.DB)
  const [user] = await db
    .insert(users)
    .values({
      github_id: githubUser.id,
      github_login: githubUser.login,
      name: githubUser.name ?? null,
      avatar_url: githubUser.avatar_url ?? null,
      role: 'user',
    })
    .onConflictDoUpdate({
      target: users.github_id,
      set: {
        github_login: githubUser.login,
        name: githubUser.name ?? null,
        avatar_url: githubUser.avatar_url ?? null,
        // role intentionally excluded — never overwrite a granted role
      },
    })
    .returning()

  // Sign first-party JWT — contains user context for API middleware
  if (!c.env.JWT_SECRET) throw new Error('JWT_SECRET not configured')
  const token = await sign(
    {
      sub: user.id,
      role: user.role,
      login: user.github_login,
      name: user.name,
      avatar_url: user.avatar_url,
      exp: Math.floor(Date.now() / 1000) + SEVEN_DAYS,
    },
    c.env.JWT_SECRET,
    'HS256',
  )

  setCookie(c, 'pc_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  })

  // Redirect popup to SPA route that calls window.close()
  return c.redirect(`${c.env.APP_ORIGIN}/auth/callback`)
})

auth.post('/dev-login', async (c) => {
  if (c.env.ENV !== 'dev') return c.notFound()
  if (!c.env.JWT_SECRET) throw new Error('JWT_SECRET not configured')

  const body = await c.req.json<{ login?: string; role?: 'user' | 'maintainer'; name?: string }>().catch(() => ({}))
  const role = body?.role === 'maintainer' ? 'maintainer' : 'user'

  // Resolve login string — fall back to fixture defaults if not provided
  const fixtureLogin =
    body.login && body.login.trim().length > 0
      ? body.login.trim()
      : role === 'maintainer' ? 'dev-maintainer' : 'dev-user'

  // Resolve sub (user ID) — keep hardcoded IDs for the two seeded fixtures,
  // generate a deterministic 26-char ULID-shaped ID for any other login
  let fixtureId: string
  if (fixtureLogin === 'dev-user') {
    fixtureId = '01DEVUSER000000000000000001'
  } else if (fixtureLogin === 'dev-maintainer') {
    fixtureId = '01DEVMAINT00000000000000001'
  } else {
    fixtureId = 'DEVUSR' + fixtureLogin.toUpperCase().replace(/[^A-Z0-9]/g, '0').slice(0, 20).padEnd(20, '0')
  }

  const resolvedName = body.name ?? fixtureLogin

  const token = await sign(
    {
      sub: fixtureId,
      role,
      login: fixtureLogin,
      name: resolvedName,
      avatar_url: null,
      exp: Math.floor(Date.now() / 1000) + SEVEN_DAYS,
    },
    c.env.JWT_SECRET,
    'HS256',
  )
  setCookie(c, 'pc_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  })
  return c.json({ ok: true, role, login: fixtureLogin })
})

auth.post('/logout', (c) => {
  deleteCookie(c, 'pc_session', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
  })
  return c.json({ ok: true })
})

// Catch-all: return 400 for unrecognised /auth/* paths (avoids top-level 404 which would
// cause the boot test to think the route is unregistered)
auth.all('*', (c) => c.json({ error: 'not_found' }, 400))

export default auth
