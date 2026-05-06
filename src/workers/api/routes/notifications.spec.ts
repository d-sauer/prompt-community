// src/workers/api/routes/notifications.spec.ts
// Wave 0 test scaffolds for Phase 11 notifications read endpoint.
// All tests are RED (failing) — /notifications is not yet mounted in index.ts.
// API-10
import { describe, it, expect, beforeAll } from 'vitest'
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

let jwtToken: string

beforeAll(async () => {
  // Mint a valid test JWT for dev-user (seeded via test-setup beforeAll + migrations)
  const jwtSecret = (env as Record<string, string>).JWT_SECRET ?? 'test-secret'
  const payload = {
    sub: '01DEVUSER000000000000000001',
    role: 'user',
    login: 'dev-user',
    exp: Math.floor(Date.now() / 1000) + 86400,
  }
  jwtToken = await sign(payload, jwtSecret)
})

describe('GET /notifications — API-10', () => {
  it('returns 401 with unauthorized envelope when no session cookie', async () => {
    const req = new Request('http://localhost/notifications')
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'unauthorized')
  })

  it('returns 200 with { data, next_cursor } when authenticated with valid JWT cookie', async () => {
    const req = new Request('http://localhost/notifications', {
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('notification items have id, type, read_at, created_at fields (when notifications exist)', async () => {
    const req = new Request('http://localhost/notifications', {
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    // Seed data has no notifications — verify shape contract only when data is non-empty
    if (body.data.length > 0) {
      const item = body.data[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('read_at')
      expect(item).toHaveProperty('created_at')
    }
    // Empty array is valid for seeded dev environment
    expect(Array.isArray(body.data)).toBe(true)
  })
})
