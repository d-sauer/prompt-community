// src/workers/api/routes/users.ts
// Phase 11-03: GET /users/:login, GET /users/:login/prompts, GET /users/:login/activity
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, lt, inArray } from 'drizzle-orm'
import * as schema from '../db/schema'
import type { Env } from '../index'

const app = new Hono<Env>()

// ─── GET /users/:login ──────────────────────────────────────────────────────
// Returns public profile for a known user by github_login.
// No auth required.
app.get('/:login', async (c) => {
  const login = c.req.param('login')
  const db = drizzle(c.env.DB, { schema })

  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.github_login, login))
    .limit(1)

  if (!rows.length) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  const user = rows[0]
  return c.json({
    id: user.id,
    login: user.github_login,
    name: user.name,
    avatar_url: user.avatar_url,
    role: user.role,
    created_at: user.created_at,
  })
})

// ─── GET /users/:login/prompts ───────────────────────────────────────────────
// Returns the user's published prompts as a paginated list.
// No auth required. Only published prompts.
app.get('/:login/prompts', async (c) => {
  const login = c.req.param('login')
  const db = drizzle(c.env.DB, { schema })

  // Resolve user
  const userRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.github_login, login))
    .limit(1)

  if (!userRows.length) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  const user = userRows[0]

  // Pagination params
  const limitParam = Number(c.req.query('limit') ?? 20)
  const cursor = c.req.query('cursor')

  if (limitParam > 100) {
    return c.json({ error: 'invalid_limit', code: 'invalid_limit' }, 400)
  }
  const limit = Math.max(1, limitParam)

  // Build where conditions
  const baseConditions = [
    eq(schema.prompts.author_id, user.id),
    eq(schema.prompts.status, 'published'),
  ]
  const conditions = cursor
    ? [...baseConditions, lt(schema.prompts.id, cursor)]
    : baseConditions

  const promptRows = await db
    .select()
    .from(schema.prompts)
    .where(and(...conditions))
    .limit(limit + 1)

  // Sort descending by ULID (time-ordered, lexicographically sortable)
  promptRows.sort((a, b) => b.id.localeCompare(a.id))

  const hasNext = promptRows.length > limit
  const page = hasNext ? promptRows.slice(0, limit) : promptRows
  const nextCursor = hasNext ? page[page.length - 1].id : null

  // Fetch tags for these prompts
  const promptIds = page.map((p) => p.id)

  const tagRows = promptIds.length
    ? await db
        .select()
        .from(schema.prompt_tags)
        .where(inArray(schema.prompt_tags.prompt_id, promptIds))
    : []

  // Fetch reactions
  const reactionRows = promptIds.length
    ? await db
        .select()
        .from(schema.reactions)
        .where(inArray(schema.reactions.prompt_id, promptIds))
    : []

  // Fetch comment counts (non-deleted)
  const commentRows = promptIds.length
    ? await db
        .select()
        .from(schema.comments)
        .where(inArray(schema.comments.prompt_id, promptIds))
    : []

  // Aggregate in JS
  const tagsByPrompt = new Map<string, string[]>()
  for (const row of tagRows) {
    const existing = tagsByPrompt.get(row.prompt_id) ?? []
    existing.push(row.tag)
    tagsByPrompt.set(row.prompt_id, existing)
  }

  const reactionsByPrompt = new Map<string, { thumbs_up: number; heart: number; rocket: number }>()
  for (const row of reactionRows) {
    const counts = reactionsByPrompt.get(row.prompt_id) ?? { thumbs_up: 0, heart: 0, rocket: 0 }
    if (row.emoji === 'thumbs_up') counts.thumbs_up++
    else if (row.emoji === 'heart') counts.heart++
    else if (row.emoji === 'rocket') counts.rocket++
    reactionsByPrompt.set(row.prompt_id, counts)
  }

  const commentCountByPrompt = new Map<string, number>()
  for (const row of commentRows) {
    if (!row.deleted_at) {
      commentCountByPrompt.set(row.prompt_id, (commentCountByPrompt.get(row.prompt_id) ?? 0) + 1)
    }
  }

  const data = page.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    model: p.model,
    difficulty: p.difficulty,
    status: p.status,
    tags: tagsByPrompt.get(p.id) ?? [],
    author: { login: user.github_login, avatar_url: user.avatar_url },
    reaction_counts: reactionsByPrompt.get(p.id) ?? { thumbs_up: 0, heart: 0, rocket: 0 },
    comment_count: commentCountByPrompt.get(p.id) ?? 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }))

  return c.json({ data, next_cursor: nextCursor })
})

// ─── GET /users/:login/activity ──────────────────────────────────────────────
// Returns a real feed of prompt_created events derived from published prompts.
// No auth required.
app.get('/:login/activity', async (c) => {
  const login = c.req.param('login')
  const db = drizzle(c.env.DB, { schema })

  // Resolve user
  const userRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.github_login, login))
    .limit(1)

  if (!userRows.length) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  const user = userRows[0]

  // Pagination params
  const limitParam = Number(c.req.query('limit') ?? 20)
  const cursor = c.req.query('cursor')

  if (limitParam > 100) {
    return c.json({ error: 'invalid_limit', code: 'invalid_limit' }, 400)
  }
  const limit = Math.max(1, limitParam)

  // Build where conditions
  const baseConditions = [
    eq(schema.prompts.author_id, user.id),
    eq(schema.prompts.status, 'published'),
  ]
  const conditions = cursor
    ? [...baseConditions, lt(schema.prompts.id, cursor)]
    : baseConditions

  const promptRows = await db
    .select({
      id: schema.prompts.id,
      title: schema.prompts.title,
      created_at: schema.prompts.created_at,
    })
    .from(schema.prompts)
    .where(and(...conditions))
    .limit(limit + 1)

  // Sort descending by ULID (time-ordered)
  promptRows.sort((a, b) => b.id.localeCompare(a.id))

  const hasNext = promptRows.length > limit
  const page = hasNext ? promptRows.slice(0, limit) : promptRows
  const nextCursor = hasNext ? page[page.length - 1].id : null

  const data = page.map((p) => ({
    type: 'prompt_created' as const,
    prompt: { id: p.id, title: p.title, created_at: p.created_at },
  }))

  return c.json({ data, next_cursor: nextCursor })
})

export default app
