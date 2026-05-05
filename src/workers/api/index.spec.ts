// src/workers/api/index.spec.ts
// Boot test for the Hono API worker — covers BACK-01, BACK-02, BACK-06.
import { describe, it, expect } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import app from './index'

const PREFIXES = ['/auth', '/prompts', '/comments', '/reactions', '/users', '/search', '/admin'] as const

describe('API worker boot', () => {
  it('GET /health returns 200 with { ok: true }', async () => {
    const req = new Request('http://localhost/health')
    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
  })

  it.each(PREFIXES)('every route prefix %s returns a response (501 stubs acceptable)', async (prefix) => {
    const req = new Request(`http://localhost${prefix}/`)
    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    // Acceptable: 501 (stub), 200, 401, 403 — anything that proves the route is REGISTERED.
    // Unacceptable: 404 (no such route) or no Response object.
    expect(res).toBeInstanceOf(Response)
    expect(res.status).not.toBe(404)
  })

  it('env.DB is defined (D1 binding wired)', () => {
    expect(env.DB).toBeDefined()
  })
})
