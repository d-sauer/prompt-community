// src/workers/api/routes/labels.ts
// Phase 11 Plan 05 gap closure — GET /labels standalone route
// Extracted from search.ts where it was incorrectly nested under /search.
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { drizzle } from 'drizzle-orm/d1'
import { asc } from 'drizzle-orm'
import type { Env } from '../index'
import * as schema from '../db/schema'

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

export default app
