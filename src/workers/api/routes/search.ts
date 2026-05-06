// src/workers/api/routes/search.ts
// Phase 11 Plan 04 — GET /search (FTS5) and GET /labels
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { drizzle } from 'drizzle-orm/d1'
import { asc } from 'drizzle-orm'
import type { Env } from '../index'
import * as schema from '../db/schema'

const app = new Hono<Env>()
app.use('*', trimTrailingSlash())

// GET /search?q=<term>
// FTS5 full-text search against prompts_fts (title + body indexed)
// Returns same summary shape as GET /prompts
// No auth required — public endpoint
app.get('/', async (c) => {
  const q = c.req.query('q')

  if (q === undefined || q === null || q === '') {
    return c.json({ error: 'missing_query', code: 'missing_query' }, 400)
  }
  if (q.length < 2) {
    return c.json({ error: 'query_too_short', code: 'query_too_short' }, 400)
  }

  const limitParam = c.req.query('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 20
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return c.json({ error: 'invalid_limit', code: 'invalid_limit' }, 400)
  }

  const cursor = c.req.query('cursor')

  const db = drizzle(c.env.DB, { schema })

  // FTS5 requires raw SQL — Drizzle cannot query virtual tables
  // Use prompts_fts MATCH for full-text search across title+body
  let ftsQuery: string
  let ftsBindings: unknown[]

  if (cursor) {
    ftsQuery = `SELECT p.id, p.title, p.category, p.model, p.difficulty, p.status, p.author_id, p.created_at, p.updated_at
      FROM prompts_fts
      JOIN prompts p ON p.rowid = prompts_fts.rowid
      WHERE prompts_fts MATCH ?
        AND p.status = 'published'
        AND p.id > ?
      ORDER BY p.id ASC
      LIMIT ?`
    ftsBindings = [q, cursor, limit + 1]
  } else {
    ftsQuery = `SELECT p.id, p.title, p.category, p.model, p.difficulty, p.status, p.author_id, p.created_at, p.updated_at
      FROM prompts_fts
      JOIN prompts p ON p.rowid = prompts_fts.rowid
      WHERE prompts_fts MATCH ?
        AND p.status = 'published'
      ORDER BY p.id ASC
      LIMIT ?`
    ftsBindings = [q, limit + 1]
  }

  const stmt = c.env.DB.prepare(ftsQuery).bind(...ftsBindings)
  const { results: rawRows } = await stmt.all<{
    id: string
    title: string
    category: string | null
    model: string | null
    difficulty: string | null
    status: string
    author_id: string
    created_at: string
    updated_at: string
  }>()

  const hasMore = rawRows.length > limit
  const rows = hasMore ? rawRows.slice(0, limit) : rawRows
  const next_cursor = hasMore ? rows[rows.length - 1].id : null

  if (rows.length === 0) {
    return c.json({ data: [], next_cursor: null })
  }

  // Fetch tags for matching prompts using raw SQL for IN clause
  const promptIds = rows.map((r) => r.id)
  const tagPlaceholders = promptIds.map(() => '?').join(',')
  const tagsResult = await c.env.DB.prepare(
    `SELECT prompt_id, tag FROM prompt_tags WHERE prompt_id IN (${tagPlaceholders})`
  ).bind(...promptIds).all<{ prompt_id: string; tag: string }>()

  const tagsByPromptId = new Map<string, string[]>()
  for (const row of tagsResult.results) {
    if (!tagsByPromptId.has(row.prompt_id)) tagsByPromptId.set(row.prompt_id, [])
    tagsByPromptId.get(row.prompt_id)!.push(row.tag)
  }

  // Fetch reaction counts for these prompts
  const reactionsResult = await c.env.DB.prepare(
    `SELECT prompt_id, emoji, COUNT(*) as count FROM reactions WHERE prompt_id IN (${tagPlaceholders}) GROUP BY prompt_id, emoji`
  ).bind(...promptIds).all<{ prompt_id: string; emoji: string; count: number }>()

  type ReactionCounts = { thumbs_up: number; heart: number; rocket: number }
  const reactionsByPromptId = new Map<string, ReactionCounts>()
  for (const row of reactionsResult.results) {
    if (!reactionsByPromptId.has(row.prompt_id)) {
      reactionsByPromptId.set(row.prompt_id, { thumbs_up: 0, heart: 0, rocket: 0 })
    }
    const counts = reactionsByPromptId.get(row.prompt_id)!
    if (row.emoji === 'thumbs_up') counts.thumbs_up = row.count
    else if (row.emoji === 'heart') counts.heart = row.count
    else if (row.emoji === 'rocket') counts.rocket = row.count
  }

  // Fetch authors for these prompts
  const authorIds = [...new Set(rows.map((r) => r.author_id))]
  const authorPlaceholders = authorIds.map(() => '?').join(',')
  const authorsResult = await c.env.DB.prepare(
    `SELECT id, github_login as login, avatar_url FROM users WHERE id IN (${authorPlaceholders})`
  ).bind(...authorIds).all<{ id: string; login: string; avatar_url: string | null }>()

  const authorsById = new Map<string, { login: string; avatar_url: string | null }>()
  for (const row of authorsResult.results) {
    authorsById.set(row.id, { login: row.login, avatar_url: row.avatar_url })
  }

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    model: row.model,
    difficulty: row.difficulty,
    status: row.status,
    tags: tagsByPromptId.get(row.id) ?? [],
    author: authorsById.get(row.author_id) ?? { login: 'unknown', avatar_url: null },
    reaction_counts: reactionsByPromptId.get(row.id) ?? { thumbs_up: 0, heart: 0, rocket: 0 },
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  return c.json({ data, next_cursor })
})

// GET /labels
// Returns all labels grouped by prefix: { categories, models, difficulties, tags }
// No auth required — public endpoint
// Cache-Control: public, max-age=300 (labels change rarely)
app.get('/labels', async (c) => {
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
