// src/workers/api/routes/prompts.spec.ts
// Wave 0 test scaffolds for Phase 11 prompts read endpoints.
// All tests are RED (failing) — routes/prompts.ts currently returns 501 for all requests.
// API-01, API-02, API-03, API-04
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

// Seeded IDs from scripts/seed.sql
const SEEDED_PROMPT_ID = '01PROMPT000000000000000001'
const SEEDED_PROMPT_AUTHOR_LOGIN = 'dev-user'
const NONEXISTENT_PROMPT_ID = '01ZZZZNOTEXIST0000000000000'

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

describe('GET /prompts — API-01', () => {
  it('returns 200 with paginated { data, next_cursor } shape', async () => {
    const req = new Request('http://localhost/prompts')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('accepts a category filter without error', async () => {
    const req = new Request('http://localhost/prompts?category=engineering')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
  })

  it('returns 400 with error envelope when limit > 100', async () => {
    const req = new Request('http://localhost/prompts?limit=101')
    const res = await request(req)

    expect(res.status).toBe(400)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'invalid_limit')
    expect(body).toHaveProperty('code', 'invalid_limit')
  })

  it('listing items include expected fields', async () => {
    const req = new Request('http://localhost/prompts')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    expect(body.data.length).toBeGreaterThan(0)
    const item = body.data[0]
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('title')
    expect(item).toHaveProperty('category')
    expect(item).toHaveProperty('author')
    expect(item).toHaveProperty('tags')
    expect(item).toHaveProperty('reaction_counts')
    expect(item).toHaveProperty('created_at')
  })

  it('unauthenticated listing items do NOT include viewer_reaction or viewer_bookmarked', async () => {
    const req = new Request('http://localhost/prompts')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    expect(body.data.length).toBeGreaterThan(0)
    const item = body.data[0]
    expect(item).not.toHaveProperty('viewer_reaction')
    expect(item).not.toHaveProperty('viewer_bookmarked')
  })

  it('authenticated listing items include viewer_reaction and viewer_bookmarked', async () => {
    const req = new Request('http://localhost/prompts', {
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    expect(body.data.length).toBeGreaterThan(0)
    const item = body.data[0]
    expect(item).toHaveProperty('viewer_reaction')
    expect(item).toHaveProperty('viewer_bookmarked')
    // viewer_bookmarked must be boolean
    expect(typeof item.viewer_bookmarked).toBe('boolean')
  })
})

describe('GET /prompts/:id — API-02', () => {
  it('returns 200 with full prompt detail for seeded prompt ID', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('id', SEEDED_PROMPT_ID)
    expect(body).toHaveProperty('title')
    expect(body).toHaveProperty('body')
    expect(body).toHaveProperty('author')
    expect(body).toHaveProperty('tags')
    expect(body).toHaveProperty('reaction_counts')
  })

  it('returns 404 with not_found envelope for nonexistent prompt ID', async () => {
    const req = new Request(`http://localhost/prompts/${NONEXISTENT_PROMPT_ID}`)
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'not_found')
    expect(body).toHaveProperty('code', 'not_found')
  })

  it('unauthenticated detail does NOT include viewer_reaction or viewer_bookmarked', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).not.toHaveProperty('viewer_reaction')
    expect(body).not.toHaveProperty('viewer_bookmarked')
  })

  it('authenticated detail includes viewer_reaction and viewer_bookmarked', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('viewer_reaction')
    expect(body).toHaveProperty('viewer_bookmarked')
    // viewer_reaction is null or a string
    expect(
      body.viewer_reaction === null || typeof body.viewer_reaction === 'string',
    ).toBe(true)
    // viewer_bookmarked is boolean
    expect(typeof body.viewer_bookmarked).toBe('boolean')
  })

  it('detail response includes author with login field', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ author: Record<string, unknown> }>()
    expect(body.author).toHaveProperty('login', SEEDED_PROMPT_AUTHOR_LOGIN)
  })
})

describe('GET /prompts/:id/versions — API-03', () => {
  it('returns 200 with { data, next_cursor } shape for seeded prompt', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/versions`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('version items include version_number, changelog, author.login, created_at fields', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/versions`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    if (body.data.length > 0) {
      const item = body.data[0]
      expect(item).toHaveProperty('version_number')
      expect(item).toHaveProperty('changelog')
      expect(item).toHaveProperty('author')
      expect(item).toHaveProperty('created_at')
      const author = item.author as Record<string, unknown>
      expect(author).toHaveProperty('login')
    }
  })

  it('returns 404 for nonexistent prompt versions', async () => {
    const req = new Request(`http://localhost/prompts/${NONEXISTENT_PROMPT_ID}/versions`)
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'not_found')
    expect(body).toHaveProperty('code', 'not_found')
  })
})

describe('GET /prompts/:id/comments — API-04', () => {
  it('returns 200 with { data, next_cursor } shape for seeded prompt', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/comments`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('comment items include id, body, author (or null), created_at fields', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/comments`)
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    if (body.data.length > 0) {
      const item = body.data[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('body')
      expect(item).toHaveProperty('author')
      expect(item).toHaveProperty('created_at')
    }
  })

  it('returns 404 for comments on nonexistent prompt', async () => {
    const req = new Request(`http://localhost/prompts/${NONEXISTENT_PROMPT_ID}/comments`)
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'not_found')
    expect(body).toHaveProperty('code', 'not_found')
  })
})
