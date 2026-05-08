// src/workers/api/routes/admin.ts
// Phase 14 Plan 02 — Admin moderation route handlers.
// API-22: GET /queue — returns flagged prompts (paginated, maintainer-only)
// API-23: GET /log — returns moderation_log history (maintainer-only)
// API-24: POST /prompts/:id/approve — approve flagged prompt, log action
// API-25: POST /prompts/:id/hide — hide a prompt, log action
// API-28: All routes guarded by requireAuth + requireMaintainer
// GET /stats — { total, flagged } COUNT queries (needed by FRONT-06/useAdminStats)
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, inArray, sql, count } from 'drizzle-orm'
import { ulid } from 'ulid'
import * as schema from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireMaintainer } from '../middleware/role'
import type { Env } from '../index'

const app = new Hono<Env>()
app.use('*', trimTrailingSlash())

const tsNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

// ---------------------------------------------------------------------------
// GET /admin/ — root (boot test probe, redirects to /queue concept)
// Returns 401 if not authenticated, 403 if not maintainer — never 404.
// ---------------------------------------------------------------------------
app.get('/', requireAuth(), requireMaintainer(), (c) => c.json({ ok: true }))

// ---------------------------------------------------------------------------
// GET /admin/queue — API-22, API-28
// Returns flagged prompts, paginated (limit 20), with author info.
// Route order: /queue BEFORE /prompts/:id/* to avoid path conflicts.
// ---------------------------------------------------------------------------
app.get('/queue', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })

  const rows = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.status, 'flagged'))
    .orderBy(desc(schema.prompts.created_at))
    .limit(21)

  const hasMore = rows.length > 20
  const items = hasMore ? rows.slice(0, 20) : rows
  const next_cursor = hasMore ? items[items.length - 1].id : null

  // Batch-fetch author info
  const authorIds = [...new Set(items.map((r) => r.author_id))]
  const authorRows =
    authorIds.length > 0
      ? await db
          .select({
            id: schema.users.id,
            login: schema.users.github_login,
            avatar_url: schema.users.avatar_url,
          })
          .from(schema.users)
          .where(inArray(schema.users.id, authorIds))
      : []
  const authorsMap: Record<string, { login: string; avatar_url: string | null }> = {}
  for (const a of authorRows) {
    authorsMap[a.id] = { login: a.login, avatar_url: a.avatar_url }
  }

  const data = items.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    author: authorsMap[p.author_id] ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }))

  return c.json({ data, next_cursor })
})

// ---------------------------------------------------------------------------
// GET /admin/log — API-23, API-28
// Returns moderation_log entries with prompt title and actor login.
// ---------------------------------------------------------------------------
app.get('/log', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })

  // Use raw D1 prepare for LEFT JOINs — simpler than Drizzle join chaining for this shape
  const result = await c.env.DB.prepare(
    `SELECT ml.id, ml.action, ml.reason, ml.created_at,
            ml.prompt_id, p.title as prompt_title,
            ml.actor_id, u.github_login as actor_login
     FROM moderation_log ml
     LEFT JOIN prompts p ON p.id = ml.prompt_id
     LEFT JOIN users u ON u.id = ml.actor_id
     ORDER BY ml.created_at DESC
     LIMIT 500`,
  ).all<{
    id: string
    action: string
    reason: string | null
    created_at: string
    prompt_id: string
    prompt_title: string | null
    actor_id: string
    actor_login: string | null
  }>()

  const data = (result.results ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    reason: row.reason,
    prompt: { id: row.prompt_id, title: row.prompt_title },
    actor: { login: row.actor_login },
    created_at: row.created_at,
  }))

  return c.json({ data })
})

// ---------------------------------------------------------------------------
// GET /admin/stats — derived COUNT queries (needed by FRONT-06/useAdminStats)
// Route order: /stats BEFORE /prompts/:id/* to avoid path conflicts.
// ---------------------------------------------------------------------------
app.get('/stats', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })

  const [totalRow] = await db
    .select({ count: count() })
    .from(schema.prompts)
    .where(eq(schema.prompts.status, 'published'))

  const [flaggedRow] = await db
    .select({ count: count() })
    .from(schema.prompts)
    .where(eq(schema.prompts.status, 'flagged'))

  return c.json({
    total: totalRow?.count ?? 0,
    flagged: flaggedRow?.count ?? 0,
  })
})

// ---------------------------------------------------------------------------
// POST /admin/prompts/:id/approve — API-24, API-28
// Updates prompt status to 'published' and inserts a moderation_log row.
// ---------------------------------------------------------------------------
app.post('/prompts/:id/approve', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const { id } = c.req.param()
  const user = c.get('user')!

  // Verify prompt exists
  const [prompt] = await db
    .select({ id: schema.prompts.id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // Parse optional body for reason (failure is ok — reason defaults to null)
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
  const reason = (body?.reason && typeof body.reason === 'string') ? body.reason : null

  // Update prompt status to published
  await db
    .update(schema.prompts)
    .set({ status: 'published', updated_at: tsNow })
    .where(eq(schema.prompts.id, id))

  // Insert moderation_log row
  await db.insert(schema.moderation_log).values({
    id: ulid(),
    prompt_id: id,
    actor_id: user.id,
    action: 'approve',
    reason,
  })

  return c.json({ success: true })
})

// ---------------------------------------------------------------------------
// POST /admin/prompts/:id/hide — API-25, API-28
// Updates prompt status to 'hidden' and inserts a moderation_log row.
// ---------------------------------------------------------------------------
app.post('/prompts/:id/hide', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const { id } = c.req.param()
  const user = c.get('user')!

  // Verify prompt exists
  const [prompt] = await db
    .select({ id: schema.prompts.id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // Parse optional body for reason (failure is ok — reason defaults to null)
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
  const reason = (body?.reason && typeof body.reason === 'string') ? body.reason : null

  // Update prompt status to hidden
  await db
    .update(schema.prompts)
    .set({ status: 'hidden', updated_at: tsNow })
    .where(eq(schema.prompts.id, id))

  // Insert moderation_log row
  await db.insert(schema.moderation_log).values({
    id: ulid(),
    prompt_id: id,
    actor_id: user.id,
    action: 'hide',
    reason,
  })

  return c.json({ success: true })
})

export default app
