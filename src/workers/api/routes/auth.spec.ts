// src/workers/api/routes/auth.spec.ts
// Wave 0 test scaffolds for Phase 10 auth route behaviors.
// All tests are RED (failing) — routes/auth.ts currently returns 501 for all requests.
// AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07, AUTH-08, AUTH-09
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { sign } from 'hono/jwt'
import app from '../index'

// Helper: fire a request through the full Hono app
async function request(req: Request, customEnv?: typeof env): Promise<Response> {
  const ctx = createExecutionContext()
  const res = await app.fetch(req, customEnv ?? env, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

// Helper: extract JWT payload from Set-Cookie header (no signature verification)
function extractJwtPayload(setCookieHeader: string): Record<string, unknown> {
  // cookie value is the JWT: name=<jwt>; options...
  const match = setCookieHeader.match(/pc_session=([^;]+)/)
  if (!match) throw new Error(`No pc_session cookie found in: ${setCookieHeader}`)
  const token = match[1]
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error(`Malformed JWT: ${token}`)
  // Decode payload (base64url → JSON)
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')
  return JSON.parse(atob(padded)) as Record<string, unknown>
}

describe('GET /auth/login — AUTH-09', () => {
  it('redirects to GitHub OAuth authorize URL with read:user and user:email scopes', async () => {
    const req = new Request('http://localhost/auth/login')
    const res = await request(req)

    // Should redirect (3xx) to GitHub
    expect(res.status).toBeGreaterThanOrEqual(301)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get('Location') ?? ''
    expect(location).toContain('github.com/login/oauth/authorize')
    expect(location).toContain('read:user')
    expect(location).toContain('user:email')
  })
})

describe('GET /auth/callback — AUTH-01, AUTH-02, AUTH-03, AUTH-04', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    // Mock GitHub OAuth token endpoint + user endpoint
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('github.com/login/oauth/access_token')) {
        return new Response(JSON.stringify({ access_token: 'gha_fake_access_token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (urlStr.includes('api.github.com/user')) {
        return new Response(
          JSON.stringify({
            id: 12345,
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://avatars.example.com/1',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      // Fallback for unexpected URLs
      return new Response('Not mocked', { status: 500 })
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = originalFetch
  })

  it('AUTH-01: response body does NOT contain access_token (token stays server-side)', async () => {
    const req = new Request('http://localhost/auth/callback?code=fake_code')
    const res = await request(req)

    // Should be a redirect or 200 — not a 501
    expect(res.status).not.toBe(501)
    // The response body must not leak the GitHub access token
    const body = await res.text()
    expect(body).not.toContain('access_token')
    expect(body).not.toContain('gha_fake_access_token')
  })

  it('AUTH-02: callback creates or updates user in D1 users table (UPSERT by github_id)', async () => {
    const req = new Request('http://localhost/auth/callback?code=fake_code')
    const res = await request(req)

    // Callback should succeed (not 501, not 500)
    expect(res.status).not.toBe(501)
    expect(res.status).not.toBe(500)

    // Verify user was upserted into DB
    const result = await env.DB.prepare(
      'SELECT * FROM users WHERE github_id = ?',
    ).bind(12345).first()
    expect(result).not.toBeNull()
    expect(result?.github_login).toBe('testuser')
  })

  it('AUTH-03: Set-Cookie header contains JWT with alg=HS256, sub claim, role claim, exp ~7 days', async () => {
    const req = new Request('http://localhost/auth/callback?code=fake_code')
    const res = await request(req)

    expect(res.status).not.toBe(501)

    const setCookieHeader = res.headers.get('Set-Cookie')
    expect(setCookieHeader).not.toBeNull()
    expect(setCookieHeader).toContain('pc_session=')

    const payload = extractJwtPayload(setCookieHeader!)

    // sub claim must be present
    expect(payload.sub).toBeTruthy()
    // role claim must be present
    expect(payload.role).toBe('user')
    // exp must be approximately 7 days from now (within ±1 hour tolerance)
    const now = Math.floor(Date.now() / 1000)
    const sevenDays = 7 * 24 * 60 * 60
    expect(payload.exp).toBeGreaterThan(now + sevenDays - 3600)
    expect(payload.exp).toBeLessThan(now + sevenDays + 3600)
  })

  it('AUTH-04: Set-Cookie has HttpOnly, Secure, SameSite=Lax attributes', async () => {
    const req = new Request('http://localhost/auth/callback?code=fake_code')
    const res = await request(req)

    expect(res.status).not.toBe(501)

    const setCookieHeader = res.headers.get('Set-Cookie') ?? ''
    expect(setCookieHeader.toLowerCase()).toContain('httponly')
    expect(setCookieHeader.toLowerCase()).toContain('secure')
    expect(setCookieHeader.toLowerCase()).toContain('samesite=lax')
  })
})

describe('GET /me — AUTH-07', () => {
  let jwtToken: string

  beforeEach(async () => {
    // Mint a valid test JWT using env.JWT_SECRET
    const jwtSecret = (env as Record<string, string>).JWT_SECRET ?? 'test-secret'
    const payload = {
      sub: '01DEVUSER000000000000000001',
      role: 'user',
      login: 'dev-user',
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    }
    jwtToken = await sign(payload, jwtSecret)
  })

  it('AUTH-07: GET /me with valid session cookie returns login, name, avatar_url, role', async () => {
    const req = new Request('http://localhost/me', {
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).not.toBe(501)
    expect(res.status).toBe(200)

    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('login')
    expect(body).toHaveProperty('name')
    expect(body).toHaveProperty('avatar_url')
    expect(body).toHaveProperty('role')
  })

  it('AUTH-07: GET /me without session cookie returns 401', async () => {
    const req = new Request('http://localhost/me')
    const res = await request(req)

    // Should require auth — not 501 (stub), not 200
    expect(res.status).toBe(401)
  })
})

describe('POST /auth/dev-login — AUTH-08', () => {
  it('AUTH-08 (dev): returns 200 and sets session cookie when ENV=dev', async () => {
    const req = new Request('http://localhost/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    // Pass custom env with ENV=dev
    const devEnv = { ...env, ENV: 'dev' }
    const res = await request(req, devEnv as typeof env)

    expect(res.status).toBe(200)
    const setCookieHeader = res.headers.get('Set-Cookie') ?? ''
    expect(setCookieHeader).toContain('pc_session=')
  })

  it('AUTH-08 (prod): returns 404 when ENV=prod', async () => {
    const req = new Request('http://localhost/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    // Pass custom env with ENV=prod
    const prodEnv = { ...env, ENV: 'prod' }
    const res = await request(req, prodEnv as typeof env)

    expect(res.status).toBe(404)
  })

  it('AUTH-08 (role): POST with { role: "maintainer" } sets JWT role=maintainer', async () => {
    const req = new Request('http://localhost/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'maintainer' }),
    })
    const devEnv = { ...env, ENV: 'dev' }
    const res = await request(req, devEnv as typeof env)

    expect(res.status).toBe(200)
    const setCookieHeader = res.headers.get('Set-Cookie') ?? ''
    expect(setCookieHeader).toContain('pc_session=')

    const payload = extractJwtPayload(setCookieHeader)
    expect(payload.role).toBe('maintainer')
  })
})
