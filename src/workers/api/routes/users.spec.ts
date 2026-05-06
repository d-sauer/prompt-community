// src/workers/api/routes/users.spec.ts
// Wave 0 test scaffolds for Phase 11 users read endpoints.
// All tests are RED (failing) — routes/users.ts currently returns 501 for all requests.
// API-05, API-06, API-07
import { describe, it, expect } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import app from '../index'

// Helper: fire a request through the full Hono app
async function request(req: Request, customEnv?: typeof env): Promise<Response> {
  const ctx = createExecutionContext()
  const res = await app.fetch(req, customEnv ?? env, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

// Seeded values from scripts/seed.sql
const SEEDED_USER_LOGIN = 'dev-user'
const NONEXISTENT_LOGIN = 'user-that-does-not-exist-xyz'

describe('GET /users/:login — API-05', () => {
  it('returns 200 with user profile for seeded login', async () => {
    const req = new Request(`http://localhost/users/${SEEDED_USER_LOGIN}`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('login', SEEDED_USER_LOGIN)
    expect(body).toHaveProperty('name')
    expect(body).toHaveProperty('avatar_url')
  })

  it('returns 404 with not_found envelope for nonexistent login', async () => {
    const req = new Request(`http://localhost/users/${NONEXISTENT_LOGIN}`)
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'not_found')
    expect(body).toHaveProperty('code', 'not_found')
  })
})

describe('GET /users/:login/prompts — API-06', () => {
  it('returns 200 with { data, next_cursor } for seeded user', async () => {
    const req = new Request(`http://localhost/users/${SEEDED_USER_LOGIN}/prompts`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('user prompts items include id, title, created_at fields', async () => {
    const req = new Request(`http://localhost/users/${SEEDED_USER_LOGIN}/prompts`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    expect(body.data.length).toBeGreaterThan(0)
    const item = body.data[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('title')
    expect(item).toHaveProperty('created_at')
  })

  it('returns 404 for prompts of nonexistent user', async () => {
    const req = new Request(`http://localhost/users/${NONEXISTENT_LOGIN}/prompts`)
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'not_found')
    expect(body).toHaveProperty('code', 'not_found')
  })
})

describe('GET /users/:login/activity — API-07', () => {
  it('returns 200 with { data, next_cursor } for seeded user', async () => {
    const req = new Request(`http://localhost/users/${SEEDED_USER_LOGIN}/activity`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('activity items have type: prompt_created, prompt.id, prompt.title, prompt.created_at', async () => {
    const req = new Request(`http://localhost/users/${SEEDED_USER_LOGIN}/activity`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    expect(body.data.length).toBeGreaterThan(0)
    const item = body.data[0]
    expect(item).toHaveProperty('type', 'prompt_created')
    expect(item).toHaveProperty('prompt')
    const prompt = item.prompt as Record<string, unknown>
    expect(prompt).toHaveProperty('id')
    expect(prompt).toHaveProperty('title')
    expect(prompt).toHaveProperty('created_at')
  })

  it('returns 404 for activity of nonexistent user', async () => {
    const req = new Request(`http://localhost/users/${NONEXISTENT_LOGIN}/activity`)
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'not_found')
    expect(body).toHaveProperty('code', 'not_found')
  })
})
