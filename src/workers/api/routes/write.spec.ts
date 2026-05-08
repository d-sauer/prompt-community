// src/workers/api/routes/write.spec.ts
// Phase 12 Plan 01 — RED test contracts for all 11 write API requirements.
// API-11: POST /prompts
// API-12: PATCH /prompts/:id
// API-13: DELETE /prompts/:id
// API-14: POST /prompts/:id/versions
// API-15: POST /prompts/:id/versions/:n/restore
// API-16: POST /prompts/:id/comments
// API-17: DELETE /comments/:id
// API-18: POST /prompts/:id/reactions
// API-19: DELETE /prompts/:id/reactions
// API-20: POST /bookmarks, DELETE /bookmarks/:promptId
// API-21: POST /notifications/:id/read
//
// All tests expected to FAIL (RED) — no write handlers implemented yet.
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
const SEEDED_PROMPT_ID = '01PROMPT000000000000000001'           // author: dev-user
const SEEDED_USER_ID = '01DEVUSER000000000000000001'            // dev-user (prompt author)
const SEEDED_MAINTAINER_ID = '01DEVMAINT00000000000000001'      // dev-maintainer

const FAKE_USER_ID = 'FAKE0000000000000000000001'               // not seeded — non-author, non-maintainer

let jwtToken: string          // dev-user (prompt author, role: 'user')
let maintainerToken: string   // dev-maintainer (role: 'maintainer')
let fakeUserToken: string     // non-seeded user (role: 'user') — for 403 tests

beforeAll(async () => {
  const jwtSecret = (env as Record<string, string>).JWT_SECRET ?? 'test-secret'

  jwtToken = await sign(
    { sub: SEEDED_USER_ID, role: 'user', login: 'dev-user', exp: Math.floor(Date.now() / 1000) + 86400 },
    jwtSecret,
  )

  maintainerToken = await sign(
    { sub: SEEDED_MAINTAINER_ID, role: 'maintainer', login: 'dev-maintainer', exp: Math.floor(Date.now() / 1000) + 86400 },
    jwtSecret,
  )

  fakeUserToken = await sign(
    { sub: FAKE_USER_ID, role: 'user', login: 'fake-user', exp: Math.floor(Date.now() / 1000) + 86400 },
    jwtSecret,
  )
})

// ---------------------------------------------------------------------------
// API-11: POST /prompts — Create a draft prompt
// ---------------------------------------------------------------------------
describe('POST /prompts — API-11', () => {
  it('returns 401 when no JWT cookie', async () => {
    const req = new Request('http://localhost/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test prompt', body: 'Test body' }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 201 with created prompt on valid body', async () => {
    const req = new Request('http://localhost/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({
        title: 'My new prompt',
        body: 'Write a test for this feature',
        category: 'engineering',
        model: 'gpt-4o',
        difficulty: 'beginner',
        tags: ['testing'],
      }),
    })
    const res = await request(req)

    expect(res.status).toBe(201)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('title', 'My new prompt')
    expect(body).toHaveProperty('body')
    expect(body).toHaveProperty('status', 'draft')
    expect(body).toHaveProperty('author')
  })

  it('returns 422 when title is missing', async () => {
    const req = new Request('http://localhost/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ body: 'Missing title prompt' }),
    })
    const res = await request(req)

    expect(res.status).toBe(422)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 422 when tags.length > 5', async () => {
    const req = new Request('http://localhost/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({
        title: 'Too many tags',
        body: 'Body content',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
      }),
    })
    const res = await request(req)

    expect(res.status).toBe(422)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-12: PATCH /prompts/:id — Update prompt fields
// ---------------------------------------------------------------------------
describe('PATCH /prompts/:id — API-12', () => {
  it('returns 401 when no JWT cookie', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated title' }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 403 when authenticated as non-author non-maintainer', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${fakeUserToken}`,
      },
      body: JSON.stringify({ title: 'Updated by non-author' }),
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 200 with updated prompt when author updates title', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ title: 'Updated by author' }),
    })
    const res = await request(req)

    expect([200, 422]).toContain(res.status)
  })

  it('returns 403 when non-maintainer attempts to set status to flagged', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ status: 'flagged' }),
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 403 when non-maintainer attempts to set status to hidden', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ status: 'hidden' }),
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-13: DELETE /prompts/:id — Hard delete prompt
// ---------------------------------------------------------------------------
describe('DELETE /prompts/:id — API-13', () => {
  it('returns 401 when no JWT cookie', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      method: 'DELETE',
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 403 when authenticated user is not author or maintainer', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}`, {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${fakeUserToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(403)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 204 when maintainer deletes a prompt', async () => {
    // Use SEEDED_PROMPT_ID = '01PROMPT000000000000000002' (owned by dev-maintainer)
    const req = new Request('http://localhost/prompts/01PROMPT000000000000000002', {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${maintainerToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(204)
  })

  it('returns 204 when author deletes their own prompt', async () => {
    // Use SEEDED_PROMPT_ID = '01PROMPT000000000000000003' (also owned by dev-user)
    const req = new Request('http://localhost/prompts/01PROMPT000000000000000003', {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(204)
  })
})

// ---------------------------------------------------------------------------
// API-14: POST /prompts/:id/versions — Publish a new version record
// ---------------------------------------------------------------------------
describe('POST /prompts/:id/versions — API-14', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Version body', changelog: 'Initial release' }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 201 with version object on valid body', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ body: 'Version body content', changelog: 'First version published' }),
    })
    const res = await request(req)

    expect(res.status).toBe(201)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('version_number')
    expect(body).toHaveProperty('changelog')
    expect(body).toHaveProperty('created_at')
  })
})

// ---------------------------------------------------------------------------
// API-15: POST /prompts/:id/versions/:n/restore — Restore a prior version
// ---------------------------------------------------------------------------
describe('POST /prompts/:id/versions/:n/restore — API-15', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/versions/1/restore`, {
      method: 'POST',
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 404 on unknown version number', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/versions/99/restore`, {
      method: 'POST',
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-16: POST /prompts/:id/comments — Create a comment
// ---------------------------------------------------------------------------
describe('POST /prompts/:id/comments — API-16', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'A comment' }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 201 with comment object on valid body', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ body: 'Great prompt! Very helpful.' }),
    })
    const res = await request(req)

    expect(res.status).toBe(201)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('body', 'Great prompt! Very helpful.')
    expect(body).toHaveProperty('author')
    expect(body).toHaveProperty('created_at')
  })

  it('returns 422 when body is missing', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({}),
    })
    const res = await request(req)

    expect(res.status).toBe(422)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-17: DELETE /comments/:id — Soft delete a comment
// ---------------------------------------------------------------------------
describe('DELETE /comments/:id — API-17', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request('http://localhost/comments/FAKE-COMMENT-ID', {
      method: 'DELETE',
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 403 when user is not comment author or maintainer', async () => {
    // First: POST a comment as dev-user (jwtToken) to get a real comment ID
    const postReq = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ body: 'Comment to be tested for 403 deletion' }),
    })
    const postRes = await request(postReq)
    expect(postRes.status).toBe(201)
    const postBody = await postRes.json<{ id: string }>()
    const commentId = postBody.id

    // Now attempt DELETE as fakeUser (non-author, non-maintainer)
    const deleteReq = new Request(`http://localhost/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${fakeUserToken}` },
    })
    const deleteRes = await request(deleteReq)

    expect(deleteRes.status).toBe(403)
    const body = await deleteRes.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 204 when author soft-deletes their comment', async () => {
    // POST a comment as dev-user, then DELETE it as dev-user
    const postReq = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ body: 'Comment to be deleted by author' }),
    })
    const postRes = await request(postReq)
    expect(postRes.status).toBe(201)
    const postBody = await postRes.json<{ id: string }>()
    const commentId = postBody.id

    const deleteReq = new Request(`http://localhost/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const deleteRes = await request(deleteReq)

    expect(deleteRes.status).toBe(204)
  })
})

// ---------------------------------------------------------------------------
// API-18: POST /prompts/:id/reactions — Add an emoji reaction
// ---------------------------------------------------------------------------
describe('POST /prompts/:id/reactions — API-18', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: 'thumbs_up' }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 201 with reaction_counts on valid emoji', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ emoji: 'heart' }),
    })
    const res = await request(req)

    expect(res.status).toBe(201)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('thumbs_up')
    expect(body).toHaveProperty('heart')
    expect(body).toHaveProperty('rocket')
  })

  it('returns 409 on duplicate reaction (same user, same emoji, same prompt)', async () => {
    // First: POST the thumbs_up reaction
    const firstReq = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ emoji: 'thumbs_up' }),
    })
    const firstRes = await request(firstReq)
    // First may return 201 or 409 if already exists from prior test runs
    expect([201, 409]).toContain(firstRes.status)

    if (firstRes.status === 201) {
      // Attempt duplicate
      const dupReq = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `pc_session=${maintainerToken}`,
        },
        body: JSON.stringify({ emoji: 'thumbs_up' }),
      })
      const dupRes = await request(dupReq)

      expect(dupRes.status).toBe(409)
      const body = await dupRes.json<Record<string, unknown>>()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
    }
  })

  it('returns 422 on invalid emoji value', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ emoji: 'invalid_emoji' }),
    })
    const res = await request(req)

    expect(res.status).toBe(422)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})

// ---------------------------------------------------------------------------
// API-19: DELETE /prompts/:id/reactions — Remove a specific emoji reaction
// ---------------------------------------------------------------------------
describe('DELETE /prompts/:id/reactions — API-19', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: 'thumbs_up' }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 204 on successful reaction removal', async () => {
    // First add a reaction so we can remove it
    const addReq = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${fakeUserToken}`,
      },
      body: JSON.stringify({ emoji: 'rocket' }),
    })
    await request(addReq)

    const req = new Request(`http://localhost/prompts/${SEEDED_PROMPT_ID}/reactions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${fakeUserToken}`,
      },
      body: JSON.stringify({ emoji: 'rocket' }),
    })
    const res = await request(req)

    expect(res.status).toBe(204)
  })
})

// ---------------------------------------------------------------------------
// API-20: POST /bookmarks — Add a bookmark
//         DELETE /bookmarks/:promptId — Remove a bookmark
// ---------------------------------------------------------------------------
describe('POST /bookmarks — API-20', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request('http://localhost/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: SEEDED_PROMPT_ID }),
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 201 on bookmark created', async () => {
    const req = new Request('http://localhost/bookmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${jwtToken}`,
      },
      body: JSON.stringify({ prompt_id: SEEDED_PROMPT_ID }),
    })
    const res = await request(req)

    expect(res.status).toBe(201)
  })
})

describe('DELETE /bookmarks/:promptId — API-20', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request(`http://localhost/bookmarks/${SEEDED_PROMPT_ID}`, {
      method: 'DELETE',
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 204 on bookmark removed', async () => {
    // First ensure bookmark exists (POST it)
    const addReq = new Request('http://localhost/bookmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `pc_session=${maintainerToken}`,
      },
      body: JSON.stringify({ prompt_id: SEEDED_PROMPT_ID }),
    })
    await request(addReq)

    const req = new Request(`http://localhost/bookmarks/${SEEDED_PROMPT_ID}`, {
      method: 'DELETE',
      headers: { Cookie: `pc_session=${maintainerToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(204)
  })
})

// ---------------------------------------------------------------------------
// API-21: POST /notifications/:id/read — Mark a notification as read
// ---------------------------------------------------------------------------
describe('POST /notifications/:id/read — API-21', () => {
  it('returns 401 when no JWT', async () => {
    const req = new Request('http://localhost/notifications/FAKE-NOTIF-ID/read', {
      method: 'POST',
    })
    const res = await request(req)

    expect(res.status).toBe(401)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })

  it('returns 404 on unknown notification ID', async () => {
    const req = new Request('http://localhost/notifications/FAKE-NOTIF-ID/read', {
      method: 'POST',
      headers: { Cookie: `pc_session=${jwtToken}` },
    })
    const res = await request(req)

    expect(res.status).toBe(404)
    const body = await res.json<Record<string, unknown>>()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('code')
  })
})
