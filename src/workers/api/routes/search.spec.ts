// src/workers/api/routes/search.spec.ts
// Wave 0 test scaffolds for Phase 11 search endpoint.
// All tests are RED (failing) — routes/search.ts currently returns 501 for all requests.
// SEARCH-01, SEARCH-02
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

describe('GET /search — SEARCH-01, SEARCH-02', () => {
  it('returns 400 with missing_query envelope when no q param is provided', async () => {
    const req = new Request('http://localhost/search')
    const res = await request(req)

    expect(res.status).toBe(400)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'missing_query')
    expect(body).toHaveProperty('code', 'missing_query')
  })

  it('returns 400 with query_too_short envelope when q is 1 character', async () => {
    const req = new Request('http://localhost/search?q=a')
    const res = await request(req)

    expect(res.status).toBe(400)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error', 'query_too_short')
    expect(body).toHaveProperty('code', 'query_too_short')
  })

  it('returns 200 with { data, next_cursor } when q is 2 characters', async () => {
    const req = new Request('http://localhost/search?q=te')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns 200 with { data, next_cursor } for a known seed data word', async () => {
    // "bug" appears in the seeded prompt title "Write a clear bug report"
    const req = new Request('http://localhost/search?q=bug')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('search result items match the same shape as GET /prompts listing items', async () => {
    // Search for "bug" — known to exist in seed data
    const req = new Request('http://localhost/search?q=bug')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<{ data: Record<string, unknown>[] }>()
    expect(body.data.length).toBeGreaterThan(0)
    const item = body.data[0]
    // Must match /prompts listing shape: id, title, category, author, tags, reaction_counts, created_at
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('title')
    expect(item).toHaveProperty('category')
    expect(item).toHaveProperty('author')
    expect(item).toHaveProperty('tags')
    expect(item).toHaveProperty('reaction_counts')
    expect(item).toHaveProperty('created_at')
  })

  it('returns 200 with empty data array for a query that matches nothing', async () => {
    const req = new Request('http://localhost/search?q=zzznomatch')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('next_cursor')
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('GET /labels — API-09', () => {
  it('returns 200 with grouped label taxonomy', async () => {
    const req = new Request('http://localhost/labels')
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('categories')
    expect(body).toHaveProperty('models')
    expect(body).toHaveProperty('difficulties')
    expect(body).toHaveProperty('tags')
    expect(Array.isArray(body.categories)).toBe(true)
    expect(Array.isArray(body.models)).toBe(true)
    expect(Array.isArray(body.difficulties)).toBe(true)
    expect(Array.isArray(body.tags)).toBe(true)
  })

  it('returns Cache-Control: public, max-age=300 header', async () => {
    const req = new Request('http://localhost/labels')
    const res = await request(req)

    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300')
  })

  it('GET /search/labels returns 404 (labels not nested under /search)', async () => {
    const req = new Request('http://localhost/search/labels')
    const res = await request(req)

    expect(res.status).toBe(404)
  })
})
