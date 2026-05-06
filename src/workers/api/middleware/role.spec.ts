// src/workers/api/middleware/role.spec.ts
// Wave 0 test scaffolds for Phase 10 role guard middleware behaviors.
// All tests are RED (failing) — requireMaintainer is a pass-through stub.
// AUTH-06: requireMaintainer 403 behavior
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import type { Env } from '../index'
import { requireAuth } from './auth'
import { requireMaintainer } from './role'

// User context type
type AuthUser = { id: string; role: string; login: string }

// Test app: requireAuth chains into requireMaintainer, so user is in context from JWT
const testApp = new Hono<{ Bindings: Env; Variables: { user: AuthUser | null } }>()

// Route that requires both auth and maintainer role
testApp.get('/admin', requireAuth(), requireMaintainer(), (c) =>
  c.json({ ok: true }),
)

// Route that injects user context directly via a setup middleware (for no-user scenario)
// We use the route WITHOUT requireAuth to test unauthenticated directly
const bareApp = new Hono<{ Bindings: Env; Variables: { user: AuthUser | null } }>()
bareApp.get('/admin-bare', requireMaintainer(), (c) => c.json({ ok: true }))

async function request(app: Hono<{ Bindings: Env; Variables: { user: AuthUser | null } }>, path: string, headers?: Record<string, string>): Promise<Response> {
  const req = new Request(`http://localhost${path}`, { headers })
  const ctx = createExecutionContext()
  const res = await app.fetch(req, env, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

async function mintJwt(role: 'user' | 'maintainer'): Promise<string> {
  const jwtSecret = (env as Record<string, string>).JWT_SECRET ?? 'test-secret'
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: role === 'maintainer' ? '01DEVMAINT00000000000000001' : '01DEVUSER000000000000000001',
    role,
    login: role === 'maintainer' ? 'dev-maintainer' : 'dev-user',
    exp: now + 7 * 24 * 60 * 60,
  }
  return sign(payload, jwtSecret)
}

describe('requireMaintainer middleware — AUTH-06', () => {
  describe('AUTH-06a: user with role=user', () => {
    it('receives 403 { error: "forbidden" }', async () => {
      const userToken = await mintJwt('user')
      const res = await request(testApp, '/admin', { Cookie: `pc_session=${userToken}` })

      expect(res.status).toBe(403)
      const body = await res.json<Record<string, unknown>>()
      expect(body.error).toBe('forbidden')
    })
  })

  describe('AUTH-06b: user with role=maintainer', () => {
    it('passes through (returns 200)', async () => {
      const maintainerToken = await mintJwt('maintainer')
      const res = await request(testApp, '/admin', { Cookie: `pc_session=${maintainerToken}` })

      expect(res.status).toBe(200)
      const body = await res.json<Record<string, unknown>>()
      expect(body.ok).toBe(true)
    })
  })

  describe('AUTH-06c: no user in context (unauthenticated)', () => {
    it('receives 403 { error: "forbidden" }', async () => {
      // Request with no cookie to the bare app (no requireAuth before requireMaintainer)
      const res = await request(bareApp, '/admin-bare')

      expect(res.status).toBe(403)
      const body = await res.json<Record<string, unknown>>()
      expect(body.error).toBe('forbidden')
    })
  })
})
