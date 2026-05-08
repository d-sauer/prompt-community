// src/workers/api/routes/notifications.ts
// Phase 11 Plan 04 — GET /notifications
// API-10: Returns the authenticated user's notifications with cursor pagination.
// Phase 12 Plan 05 — POST /notifications/:id/read
// API-21: Mark a single notification as read (sets read_at timestamp)
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, lt, desc, sql } from 'drizzle-orm'
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

// POST /notifications/:id/read — Mark a notification as read
// requireAuth: returns 401 without valid cookie
// 404 if notification not found OR belongs to a different user (do not reveal existence)
// 200 with full updated notification object { id, type, prompt_id, comment_id, read_at, created_at }
// Idempotent: if already read, updates read_at and returns 200
app.post('/:id/read', requireAuth(), async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const db = drizzle(c.env.DB, { schema })

  // Fetch notification — ensure it belongs to the authenticated user (404 if not found or wrong user)
  const notification = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.id, id), eq(schema.notifications.user_id, user.id)))
    .get()

  if (!notification) {
    return c.json({ error: 'notification not found', code: 'not_found' }, 404)
  }

  // Set read_at to current timestamp (idempotent: always updates, even if already set)
  await db
    .update(schema.notifications)
    .set({ read_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` })
    .where(eq(schema.notifications.id, id))

  // Re-fetch updated notification
  const updated = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.id, id))
    .get()

  return c.json({
    id: updated!.id,
    type: updated!.type,
    prompt_id: updated!.prompt_id,
    comment_id: updated!.comment_id,
    read_at: updated!.read_at,
    created_at: updated!.created_at,
  })
})

export default app
