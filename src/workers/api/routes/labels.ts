// src/workers/api/routes/labels.ts
// Phase 11 Plan 05 gap closure — GET /labels standalone route
// Extracted from search.ts where it was incorrectly nested under /search.
// Phase 14 Plan 02 — POST, PATCH, DELETE write handlers added (API-26, API-28)
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { drizzle } from 'drizzle-orm/d1'
import { asc, eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import type { Env } from '../index'
import * as schema from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requireMaintainer } from '../middleware/role'

const app = new Hono<Env>()
app.use('*', trimTrailingSlash())

// GET /labels
// Returns all labels grouped by prefix: { categories, models, difficulties, tags }
// No auth required — public endpoint
// Cache-Control: public, max-age=300 (labels change rarely)
app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema })

  const rows = await db
    .select()
    .from(schema.labels)
    .orderBy(asc(schema.labels.prefix), asc(schema.labels.value))

  type LabelItem = {
    id: string
    prefix: string
    value: string
    color: string | null
    description: string | null
  }

  const grouped = {
    categories: [] as LabelItem[],
    models: [] as LabelItem[],
    difficulties: [] as LabelItem[],
    tags: [] as LabelItem[],
  }

  for (const row of rows) {
    const item: LabelItem = {
      id: row.id,
      prefix: row.prefix,
      value: row.value,
      color: row.color ?? null,
      description: row.description ?? null,
    }
    if (row.prefix === 'category') grouped.categories.push(item)
    else if (row.prefix === 'model') grouped.models.push(item)
    else if (row.prefix === 'difficulty') grouped.difficulties.push(item)
    else grouped.tags.push(item)
  }

  c.header('Cache-Control', 'public, max-age=300')
  return c.json(grouped)
})

// ---------------------------------------------------------------------------
// POST /labels — API-26, API-28
// Create a new label. Maintainer-only.
// ---------------------------------------------------------------------------
app.post('/', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })

  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null

  const prefix = body?.prefix
  const value = body?.value

  if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }

  const id = ulid()
  await db.insert(schema.labels).values({
    id,
    prefix: prefix.trim(),
    value: value.trim(),
    color: (body?.color && typeof body.color === 'string') ? body.color : null,
    description: (body?.description && typeof body.description === 'string') ? body.description : null,
  })

  const [row] = await db
    .select()
    .from(schema.labels)
    .where(eq(schema.labels.id, id))
    .limit(1)

  return c.json(row, 201)
})

// ---------------------------------------------------------------------------
// PATCH /labels/:id — API-26, API-28
// Update an existing label. Maintainer-only.
// ---------------------------------------------------------------------------
app.patch('/:id', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const { id } = c.req.param()

  const [existing] = await db
    .select()
    .from(schema.labels)
    .where(eq(schema.labels.id, id))
    .limit(1)

  if (!existing) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null

  // Build update object with only present fields
  const updates: Record<string, unknown> = {}
  if (body?.prefix !== undefined) updates.prefix = body.prefix
  if (body?.value !== undefined) updates.value = body.value
  if (body?.color !== undefined) updates.color = body.color
  if (body?.description !== undefined) updates.description = body.description

  if (Object.keys(updates).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.update(schema.labels).set(updates as any).where(eq(schema.labels.id, id))
  }

  const [updated] = await db
    .select()
    .from(schema.labels)
    .where(eq(schema.labels.id, id))
    .limit(1)

  return c.json(updated)
})

// ---------------------------------------------------------------------------
// DELETE /labels/:id — API-26, API-28
// Delete a label. Maintainer-only.
// ---------------------------------------------------------------------------
app.delete('/:id', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const { id } = c.req.param()

  const [existing] = await db
    .select()
    .from(schema.labels)
    .where(eq(schema.labels.id, id))
    .limit(1)

  if (!existing) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  await db.delete(schema.labels).where(eq(schema.labels.id, id))

  return new Response(null, { status: 204 })
})

export default app
