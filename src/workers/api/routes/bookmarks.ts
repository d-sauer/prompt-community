// src/workers/api/routes/bookmarks.ts
// Phase 12 Plan 05 — POST /bookmarks + DELETE /bookmarks/:promptId
// API-20: Server-side cross-device bookmark management backed by D1
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'
import * as schema from '../db/schema'

const app = new Hono<Env>()
app.use('*', trimTrailingSlash())

// POST /bookmarks — Add a bookmark (idempotent: returns 201 whether new or already exists)
// requireAuth: returns 401 { error: 'unauthorized', code: 'token_missing' } without valid cookie
// Body: { prompt_id: string }
// Response: 201 { user_id, prompt_id, created_at }
// Errors: 422 if prompt_id missing; 404 if prompt not found
app.post('/', requireAuth(), async (c) => {
  const user = c.get('user')!
  const db = drizzle(c.env.DB, { schema })

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_body', code: 'invalid_body' }, 422)
  }

  const prompt_id = body.prompt_id
  if (!prompt_id || typeof prompt_id !== 'string') {
    return c.json({ error: 'prompt_id is required', code: 'missing_field' }, 422)
  }

  // Verify prompt exists
  const prompt = await db
    .select({ id: schema.prompts.id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, prompt_id))
    .get()

  if (!prompt) {
    return c.json({ error: 'prompt not found', code: 'not_found' }, 404)
  }

  // INSERT OR IGNORE — idempotent: if bookmark already exists, do nothing
  await db
    .insert(schema.bookmarks)
    .values({ user_id: user.id, prompt_id })
    .onConflictDoNothing()

  // Fetch the bookmark row (whether newly created or pre-existing)
  const bookmark = await db
    .select()
    .from(schema.bookmarks)
    .where(and(eq(schema.bookmarks.user_id, user.id), eq(schema.bookmarks.prompt_id, prompt_id)))
    .get()

  return c.json({ user_id: bookmark!.user_id, prompt_id: bookmark!.prompt_id, created_at: bookmark!.created_at }, 201)
})

// DELETE /bookmarks/:promptId — Remove a bookmark (idempotent: 204 even if not found)
// requireAuth: returns 401 without valid cookie
// Response: 204 No Content
app.delete('/:promptId', requireAuth(), async (c) => {
  const user = c.get('user')!
  const promptId = c.req.param('promptId')
  const db = drizzle(c.env.DB, { schema })

  await db
    .delete(schema.bookmarks)
    .where(and(eq(schema.bookmarks.user_id, user.id), eq(schema.bookmarks.prompt_id, promptId)))

  return new Response(null, { status: 204 })
})

export default app
