// src/workers/api/routes/comments.ts
// Phase 12 Plan 04: DELETE /comments/:id — soft-delete a comment (API-17)
// Author or maintainer only; sets deleted_at timestamp.
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'
import * as schema from '../db/schema'

const app = new Hono<Env>()
app.use('*', trimTrailingSlash())

// ---------------------------------------------------------------------------
// DELETE /comments/:id — API-17: Soft-delete a comment
// ---------------------------------------------------------------------------
app.delete('/:id', requireAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')!
  const { id } = c.req.param()

  // Look up the comment
  const [comment] = await db
    .select({ id: schema.comments.id, author_id: schema.comments.author_id })
    .from(schema.comments)
    .where(eq(schema.comments.id, id))
    .limit(1)

  if (!comment) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // Auth check: must be comment author or maintainer
  if (user.id !== comment.author_id && user.role !== 'maintainer') {
    return c.json({ error: 'forbidden', code: 'forbidden' }, 403)
  }

  // Soft delete: set deleted_at timestamp
  await db
    .update(schema.comments)
    .set({ deleted_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` })
    .where(and(eq(schema.comments.id, id)))

  return new Response(null, { status: 204 })
})

export default app
