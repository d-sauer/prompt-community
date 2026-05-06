// src/workers/api/middleware/auth.spec.ts
// Wave 0 test scaffolds for Phase 10 auth middleware behaviors.
// All tests are RED (failing) — requireAuth and optionalAuth are pass-through stubs.
// AUTH-05: requireAuth (token_missing, token_expired) and optionalAuth
import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import type { Env } from '../index'
import { requireAuth, optionalAuth } from './auth'

// User context type that auth middleware sets via c.set('user', ...)
type AuthUser = { id: string; role: string; login: string }

// Build a test Hono app that mounts the middleware under test
const testApp = new Hono<{ Bindings: Env; Variables: { user: AuthUser | null } }>()
testApp.get('/protected', requireAuth(), (c) => c.json({ ok: true, user: c.get('user') }))
testApp.get('/optional', optionalAuth(), (c) => c.json({ ok: true, user: c.get('user') }))

async function request(path: string, headers?: Record<string, string>): Promise<Response> {
  const req = new Request(`http://localhost${path}`, { headers })
  const ctx = createExecutionContext()
  const res = await testApp.fetch(req, env, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

async function mintJwt(overrides: Partial<{ sub: string; role: string; login: string; exp: number }> = {}): Promise<string> {
  const jwtSecret = (env as Record<string, string>).JWT_SECRET ?? 'test-secret'
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: '01DEVUSER000000000000000001',
    role: 'user',
    login: 'dev-user',
    exp: now + 7 * 24 * 60 * 60,
    ...overrides,
  }
  return sign(payload, jwtSecret)
}

describe('requireAuth middleware — AUTH-05', () => {
  describe('AUTH-05a: missing cookie', () => {
    it('returns 401 with error=unauthorized and code=token_missing', async () => {
      const res = await request('/protected')

      expect(res.status).toBe(401)
      const body = await res.json<Record<string, unknown>>()
      expect(body.error).toBe('unauthorized')
      expect(body.code).toBe('token_missing')
    })
  })

  describe('AUTH-05b: expired JWT cookie', () => {
    it('returns 401 with error=unauthorized and code=token_expired', async () => {
      // Mint a JWT with exp 1 minute in the past
      const expiredToken = await mintJwt({ exp: Math.floor(Date.now() / 1000) - 60 })
      const res = await request('/protected', { Cookie: `pc_session=${expiredToken}` })

      expect(res.status).toBe(401)
      const body = await res.json<Record<string, unknown>>()
      expect(body.error).toBe('unauthorized')
      expect(body.code).toBe('token_expired')
    })
  })

  describe('AUTH-05c: valid JWT cookie', () => {
    it('passes through (returns 200) and c.get("user") is set with id, role, login', async () => {
      const validToken = await mintJwt()
      const res = await request('/protected', { Cookie: `pc_session=${validToken}` })

      expect(res.status).toBe(200)
      const body = await res.json<{ ok: boolean; user: AuthUser }>()
      expect(body.ok).toBe(true)
      // user context must be populated
      expect(body.user).toBeTruthy()
      expect(body.user.role).toBe('user')
      expect(body.user.login).toBe('dev-user')
    })
  })
})

describe('optionalAuth middleware', () => {
  it('no cookie: next() called (200), c.get("user") is null — no 401', async () => {
    const res = await request('/optional')

    // Must not block (no 401)
    expect(res.status).toBe(200)
    const body = await res.json<{ ok: boolean; user: AuthUser | null }>()
    expect(body.ok).toBe(true)
    // user must be null when no cookie
    expect(body.user).toBeNull()
  })

  it('valid cookie: next() called (200), c.get("user") is populated', async () => {
    const validToken = await mintJwt()
    const res = await request('/optional', { Cookie: `pc_session=${validToken}` })

    expect(res.status).toBe(200)
    const body = await res.json<{ ok: boolean; user: AuthUser | null }>()
    expect(body.ok).toBe(true)
    // user must be populated
    expect(body.user).toBeTruthy()
    expect(body.user?.role).toBe('user')
  })
})
