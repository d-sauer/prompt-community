// src/workers/api/routes/admin.spec.ts
// Phase 14 Plan 01 — RED test contracts for all admin API requirements.
// API-22: GET /admin/queue — returns flagged prompts (maintainer only)
// API-23: GET /admin/log — returns moderation log (maintainer only)
// API-24: POST /admin/prompts/:id/approve — approves flagged prompt, logs action
// API-25: POST /admin/prompts/:id/hide — hides a prompt, logs action
// API-26: POST /labels, PATCH /labels/:id, DELETE /labels/:id — label CRUD (maintainer only)
// API-27: Consistent JSON error shape { error, code } across all endpoints
// API-28: All admin and write routes guarded by JWT + role middleware
//
// All tests expected to FAIL (RED) — admin.ts is a 501 stub.
import { describe, it, expect, beforeAll } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { sign } from 'hono/jwt'
import app from '../index'

// Helper: fire a request through the full Hono app
async function request(req: Request): Promise<Response> {
  const ctx = createExecutionContext()
  const res = await app.fetch(req, env, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

// Seeded IDs from scripts/seed.sql
const SEEDED_MAINTAINER_ID = '01DEVMAINT00000000000000001'
const SEEDED_USER_ID = '01DEVUSER000000000000000001'

// Label IDs seeded in scripts/seed.sql
const SEEDED_LABEL_ID = '01LABEL00000000000000000001'   // category:engineering
const LABEL_TO_DELETE_ID = '01LABEL00000000000000000007'  // difficulty:advanced

let maintainerToken: string
let userToken: string

// Note: seed.sql has NO flagged prompts — insert one here for queue/approve/hide tests
const FLAGGED_PROMPT_ID = '01PFLAGGED0000000000000001'

beforeAll(async () => {
  const jwtSecret = (env as Record<string, string>).JWT_SECRET ?? 'test-secret'

  maintainerToken = await sign(
    { sub: SEEDED_MAINTAINER_ID, role: 'maintainer', login: 'dev-maintainer', exp: Math.floor(Date.now() / 1000) + 86400 },
    jwtSecret,
  )

  userToken = await sign(
    { sub: SEEDED_USER_ID, role: 'user', login: 'dev-user', exp: Math.floor(Date.now() / 1000) + 86400 },
    jwtSecret,
  )

  // Insert a flagged prompt for queue/moderation tests (not in seed.sql)
  await env.DB.prepare(
    `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`,
  ).bind(FLAGGED_PROMPT_ID, SEEDED_USER_ID, 'Suspicious Prompt', 'Bad content').run()
})

// ---------------------------------------------------------------------------
// API-22 + API-28: GET /admin/queue — Returns flagged prompts
// ---------------------------------------------------------------------------
describe('GET /admin/queue — API-22, API-28', () => {
  it('returns 200 with { data, next_cursor } for maintainer', async () => {
    const req = new Request('http://localhost/admin/queue', {
      headers: { Cookie: `pc_session=${maintainerToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body).toHaveProperty('next_cursor')
  })

  it('returns 401 with { error, code } when no JWT provided', async () => {
    const req = new Request('http://localhost/admin/queue')
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 403 with { error, code } when authenticated as regular user', async () => {
    const req = new Request('http://localhost/admin/queue', {
      headers: { Cookie: `pc_session=${userToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('includes the seeded flagged prompt in the queue', async () => {
    const req = new Request('http://localhost/admin/queue', {
      headers: { Cookie: `pc_session=${maintainerToken}` },
    })
    const res = await request(req)
    expect(res.status).toBe(200)

    const body = await res.json<{ data: Array<{ id: string }> }>()
    const ids = body.data.map((p) => p.id)
    expect(ids).toContain(FLAGGED_PROMPT_ID)
  })
})

// ---------------------------------------------------------------------------
// API-23 + API-28: GET /admin/log — Returns moderation log
// ---------------------------------------------------------------------------
describe('GET /admin/log — API-23, API-28', () => {
  it('returns 200 with { data } for maintainer', async () => {
    const req = new Request('http://localhost/admin/log', {
      headers: { Cookie: `pc_session=${maintainerToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('returns 401 with { error, code } when no JWT provided', async () => {
    const req = new Request('http://localhost/admin/log')
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 403 with { error, code } when authenticated as regular user', async () => {
    const req = new Request('http://localhost/admin/log', {
      headers: { Cookie: `pc_session=${userToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-24 + API-28: POST /admin/prompts/:id/approve — Approve a flagged prompt
// ---------------------------------------------------------------------------
describe('POST /admin/prompts/:id/approve — API-24, API-28', () => {
  it('returns 200 when maintainer approves a flagged prompt', async () => {
    // Insert a separate flagged prompt specifically for the approve test
    const APPROVE_PROMPT_ID = '01PFLAGGEDAPPROVE000000001'
    await env.DB.prepare(
      `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`,
    ).bind(APPROVE_PROMPT_ID, SEEDED_USER_ID, 'To Be Approved', 'Content to approve').run()

    const req = new Request(`http://localhost/admin/prompts/${APPROVE_PROMPT_ID}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ reason: 'Looks good' }),
    })
    const res = await request(req)

    expect(res.status).toBe(200)
  })

  it('updates prompt status to published after approve', async () => {
    const APPROVE_VERIFY_ID = '01PFLAGGEDAPPRV000000000001'
    await env.DB.prepare(
      `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`,
    ).bind(APPROVE_VERIFY_ID, SEEDED_USER_ID, 'To Verify Approve', 'Verify content').run()

    const req = new Request(`http://localhost/admin/prompts/${APPROVE_VERIFY_ID}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({}),
    })
    await request(req)

    // Verify DB state
    const row = await env.DB.prepare(`SELECT status FROM prompts WHERE id = ?`)
      .bind(APPROVE_VERIFY_ID)
      .first<{ status: string }>()
    expect(row?.status).toBe('published')
  })

  it('inserts a moderation_log row after approve', async () => {
    const APPROVE_LOG_ID = '01PFLAGGEDLOG0APPROVE000001'
    await env.DB.prepare(
      `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`,
    ).bind(APPROVE_LOG_ID, SEEDED_USER_ID, 'To Check Log Approve', 'Log check content').run()

    const req = new Request(`http://localhost/admin/prompts/${APPROVE_LOG_ID}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ reason: 'All clear' }),
    })
    await request(req)

    // Verify moderation_log row
    const logRow = await env.DB.prepare(
      `SELECT * FROM moderation_log WHERE prompt_id = ? AND action = 'approve'`,
    )
      .bind(APPROVE_LOG_ID)
      .first<{ action: string; actor_id: string }>()
    expect(logRow).not.toBeNull()
    expect(logRow?.action).toBe('approve')
    expect(logRow?.actor_id).toBe(SEEDED_MAINTAINER_ID)
  })

  it('returns 403 with { error, code } when regular user attempts approve', async () => {
    const req = new Request(`http://localhost/admin/prompts/${FLAGGED_PROMPT_ID}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${userToken}`,
      },
      body: JSON.stringify({}),
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-25 + API-28: POST /admin/prompts/:id/hide — Hide a prompt
// ---------------------------------------------------------------------------
describe('POST /admin/prompts/:id/hide — API-25, API-28', () => {
  it('returns 200 when maintainer hides a flagged prompt', async () => {
    const HIDE_PROMPT_ID = '01PFLAGGEDHIDE0000000000001'
    await env.DB.prepare(
      `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`,
    ).bind(HIDE_PROMPT_ID, SEEDED_USER_ID, 'To Be Hidden', 'Content to hide').run()

    const req = new Request(`http://localhost/admin/prompts/${HIDE_PROMPT_ID}/hide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ reason: 'Violation' }),
    })
    const res = await request(req)

    expect(res.status).toBe(200)
  })

  it('updates prompt status to hidden after hide', async () => {
    const HIDE_VERIFY_ID = '01PFLAGGEDHIDEVERIFY0000001'
    await env.DB.prepare(
      `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`,
    ).bind(HIDE_VERIFY_ID, SEEDED_USER_ID, 'To Verify Hide', 'Verify hide content').run()

    const req = new Request(`http://localhost/admin/prompts/${HIDE_VERIFY_ID}/hide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({}),
    })
    await request(req)

    const row = await env.DB.prepare(`SELECT status FROM prompts WHERE id = ?`)
      .bind(HIDE_VERIFY_ID)
      .first<{ status: string }>()
    expect(row?.status).toBe('hidden')
  })

  it('inserts a moderation_log row after hide', async () => {
    const HIDE_LOG_ID = '01PFLAGGEDLOGHIDE000000001'
    await env.DB.prepare(
      `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`,
    ).bind(HIDE_LOG_ID, SEEDED_USER_ID, 'To Check Log Hide', 'Log check content').run()

    const req = new Request(`http://localhost/admin/prompts/${HIDE_LOG_ID}/hide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ reason: 'Policy violation' }),
    })
    await request(req)

    const logRow = await env.DB.prepare(
      `SELECT * FROM moderation_log WHERE prompt_id = ? AND action = 'hide'`,
    )
      .bind(HIDE_LOG_ID)
      .first<{ action: string; actor_id: string }>()
    expect(logRow).not.toBeNull()
    expect(logRow?.action).toBe('hide')
    expect(logRow?.actor_id).toBe(SEEDED_MAINTAINER_ID)
  })

  it('returns 403 with { error, code } when regular user attempts hide', async () => {
    const req = new Request(`http://localhost/admin/prompts/${FLAGGED_PROMPT_ID}/hide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${userToken}`,
      },
      body: JSON.stringify({}),
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-26 + API-28: Label writes — POST /labels, PATCH /labels/:id, DELETE /labels/:id
// ---------------------------------------------------------------------------
describe('POST /labels — API-26, API-28', () => {
  it('returns 201 with label object when maintainer creates a label', async () => {
    const req = new Request('http://localhost/labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ prefix: 'tag', value: 'automation', color: '#6366f1', description: 'Automation prompts' }),
    })
    const res = await request(req)

    expect(res.status).toBe(201)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('prefix', 'tag')
    expect(body).toHaveProperty('value', 'automation')
  })

  it('returns 403 with { error, code } when regular user attempts to create a label', async () => {
    const req = new Request('http://localhost/labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${userToken}`,
      },
      body: JSON.stringify({ prefix: 'tag', value: 'bad-actor' }),
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 401 with { error, code } when no JWT provided', async () => {
    const req = new Request('http://localhost/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: 'tag', value: 'anon' }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 422 when prefix or value is missing', async () => {
    const req = new Request('http://localhost/labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ prefix: 'tag' }),
    })
    const res = await request(req)

    expect(res.status).toBe(422)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

describe('PATCH /labels/:id — API-26, API-28', () => {
  it('returns 200 with updated label when maintainer updates a label', async () => {
    const req = new Request(`http://localhost/labels/${SEEDED_LABEL_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ description: 'Updated description' }),
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('id', SEEDED_LABEL_ID)
    expect(body).toHaveProperty('description', 'Updated description')
  })

  it('returns 403 with { error, code } when regular user attempts to update a label', async () => {
    const req = new Request(`http://localhost/labels/${SEEDED_LABEL_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${userToken}`,
      },
      body: JSON.stringify({ description: 'Should fail' }),
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 404 when label id does not exist', async () => {
    const req = new Request('http://localhost/labels/NONEXISTENT0000000000000001', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ description: 'Nope' }),
    })
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

describe('DELETE /labels/:id — API-26, API-28', () => {
  it('returns 204 when maintainer deletes a label', async () => {
    const req = new Request(`http://localhost/labels/${LABEL_TO_DELETE_ID}`, {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${maintainerToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(204)
  })

  it('returns 403 with { error, code } when regular user attempts to delete a label', async () => {
    // Use a different label that hasn't been deleted yet
    const req = new Request(`http://localhost/labels/${SEEDED_LABEL_ID}`, {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${userToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 401 with { error, code } when no JWT provided', async () => {
    const req = new Request(`http://localhost/labels/${SEEDED_LABEL_ID}`, {
      method: 'DELETE',
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// GET /admin/stats — derived from D1 COUNT queries (no req ID — needed by FRONT-06/useAdminStats)
// ---------------------------------------------------------------------------
describe('GET /admin/stats', () => {
  it('returns 200 with { total, flagged } for maintainer', async () => {
    const req = new Request('http://localhost/admin/stats', {
      headers: { Cookie: `pc_session=${maintainerToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(200)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('flagged')
    expect(typeof body.total).toBe('number')
    expect(typeof body.flagged).toBe('number')
  })

  it('returns 401 with { error, code } when no JWT provided', async () => {
    const req = new Request('http://localhost/admin/stats')
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 403 with { error, code } when authenticated as regular user', async () => {
    const req = new Request('http://localhost/admin/stats', {
      headers: { Cookie: `pc_session=${userToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})
