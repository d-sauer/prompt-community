// src/workers/api/routes/notifications.ts
// Phase 11 Plan 04 — GET /notifications
// API-10: Returns the authenticated user's notifications with cursor pagination.
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, lt, desc } from 'drizzle-orm'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'
import * as schema from '../db/schema'

const app = new Hono<Env>()

// GET /notifications
// requireAuth: returns 401 { error: 'unauthorized', code: 'token_missing' } without valid cookie
// Authenticated: returns { data: Notification[], next_cursor }
// Cursor pagination: WHERE id < :cursor ORDER BY id DESC LIMIT :limit
// Default limit: 20, max: 100
app.get('/', requireAuth(), async (c) => {
  const user = c.get('user')!

  const limitParam = c.req.query('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 20
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return c.json({ error: 'invalid_limit', code: 'invalid_limit' }, 400)
  }

  const cursor = c.req.query('cursor')
  const db = drizzle(c.env.DB, { schema })

  const conditions = [eq(schema.notifications.user_id, user.id)]
  if (cursor) {
    conditions.push(lt(schema.notifications.id, cursor))
  }

  const rows = await db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const next_cursor = hasMore ? page[page.length - 1].id : null

  const data = page.map((n) => ({
    id: n.id,
    type: n.type,
    prompt_id: n.prompt_id,
    comment_id: n.comment_id,
    read_at: n.read_at,
    created_at: n.created_at,
  }))

  return c.json({ data, next_cursor })
})

export default app
