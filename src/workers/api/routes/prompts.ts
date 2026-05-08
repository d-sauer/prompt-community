// src/workers/api/routes/prompts.ts
// Phase 11 Plan 02: GET handlers for prompts read API.
// API-01: GET /prompts — paginated listing with filters and optional viewer fields
// API-02: GET /prompts/:id — full prompt detail
// API-03: GET /prompts/:id/versions — version history
// API-04: GET /prompts/:id/comments — comments with soft-delete masking
// Phase 12 Plan 02: Write handlers added
// API-11: POST /prompts — Create a draft prompt
// API-12: PATCH /prompts/:id — Update prompt fields
// API-13: DELETE /prompts/:id — Hard delete prompt + dependents
import { Hono } from 'hono'
import { trimTrailingSlash } from 'hono/trailing-slash'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, lt, gt, inArray, desc, asc, sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { optionalAuth, requireAuth } from '../middleware/auth'
import { ulid } from 'ulid'
import type { Env } from '../index'

const app = new Hono<Env>()
// Normalize trailing slashes so /prompts/ routes to the same handler as /prompts
app.use('*', trimTrailingSlash())

// ---------------------------------------------------------------------------
// Shared helper: build a prompt summary item from raw data
// ---------------------------------------------------------------------------
function buildSummaryItem(
  p: typeof schema.prompts.$inferSelect,
  tags: string[],
  author: { github_login: string; avatar_url: string | null } | undefined,
  reaction_counts: { thumbs_up: number; heart: number; rocket: number },
  comment_count: number,
  viewerFields?: { viewer_reaction: string | null; viewer_bookmarked: boolean },
): Record<string, unknown> {
  const item: Record<string, unknown> = {
    id: p.id,
    title: p.title,
    category: p.category,
    model: p.model,
    difficulty: p.difficulty,
    status: p.status,
    tags,
    author: author ? { login: author.github_login, avatar_url: author.avatar_url } : null,
    reaction_counts,
    comment_count,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }
  if (viewerFields !== undefined) {
    item.viewer_reaction = viewerFields.viewer_reaction
    item.viewer_bookmarked = viewerFields.viewer_bookmarked
  }
  return item
}

// ---------------------------------------------------------------------------
// GET /prompts — API-01
// ---------------------------------------------------------------------------
app.get('/', optionalAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')

  const { category, model, difficulty, cursor, limit: limitParam } = c.req.query()

  const limit = limitParam ? parseInt(limitParam, 10) : 20
  if (isNaN(limit) || limit > 100) {
    return c.json({ error: 'invalid_limit', code: 'invalid_limit' }, 400)
  }

  // Build WHERE conditions for published prompts
  const publishedConditions: ReturnType<typeof eq>[] = [
    eq(schema.prompts.status, 'published'),
  ]
  if (category) publishedConditions.push(eq(schema.prompts.category, category))
  if (model) publishedConditions.push(eq(schema.prompts.model, model))
  if (difficulty) publishedConditions.push(eq(schema.prompts.difficulty, difficulty))
  if (cursor) publishedConditions.push(lt(schema.prompts.id, cursor))

  let rows = await db
    .select()
    .from(schema.prompts)
    .where(and(...publishedConditions))
    .orderBy(desc(schema.prompts.id))
    .limit(limit + 1)

  // If authenticated, also include the user's own drafts
  if (user) {
    const draftConditions: ReturnType<typeof eq>[] = [
      eq(schema.prompts.author_id, user.id),
      eq(schema.prompts.status, 'draft'),
    ]
    if (category) draftConditions.push(eq(schema.prompts.category, category))
    if (model) draftConditions.push(eq(schema.prompts.model, model))
    if (difficulty) draftConditions.push(eq(schema.prompts.difficulty, difficulty))
    if (cursor) draftConditions.push(lt(schema.prompts.id, cursor))

    const draftRows = await db
      .select()
      .from(schema.prompts)
      .where(and(...draftConditions))
      .orderBy(desc(schema.prompts.id))

    if (draftRows.length > 0) {
      const seen = new Set(rows.map((r) => r.id))
      for (const d of draftRows) {
        if (!seen.has(d.id)) rows.push(d)
      }
      rows.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0))
      rows = rows.slice(0, limit + 1)
    }
  }

  const hasMore = rows.length > limit
  if (hasMore) rows = rows.slice(0, limit)
  const nextCursor = hasMore ? rows[rows.length - 1].id : null

  if (rows.length === 0) {
    return c.json({ data: [], next_cursor: null })
  }

  const promptIds = rows.map((r) => r.id)

  // Fetch tags for all prompts in one query
  const tagRows = await db
    .select()
    .from(schema.prompt_tags)
    .where(inArray(schema.prompt_tags.prompt_id, promptIds))
  const tagsMap: Record<string, string[]> = {}
  for (const t of tagRows) {
    if (!tagsMap[t.prompt_id]) tagsMap[t.prompt_id] = []
    tagsMap[t.prompt_id].push(t.tag)
  }

  // Fetch authors for all prompts
  const authorIds = [...new Set(rows.map((r) => r.author_id))]
  const authorRows = await db
    .select()
    .from(schema.users)
    .where(inArray(schema.users.id, authorIds))
  const authorsMap: Record<string, { github_login: string; avatar_url: string | null }> = {}
  for (const a of authorRows) {
    authorsMap[a.id] = { github_login: a.github_login, avatar_url: a.avatar_url }
  }

  // Fetch all reactions for these prompts and aggregate in JS
  const reactionRows = await db
    .select()
    .from(schema.reactions)
    .where(inArray(schema.reactions.prompt_id, promptIds))
  const reactionsMap: Record<string, { thumbs_up: number; heart: number; rocket: number }> = {}
  for (const id of promptIds) reactionsMap[id] = { thumbs_up: 0, heart: 0, rocket: 0 }
  for (const r of reactionRows) {
    if (r.emoji === 'thumbs_up') reactionsMap[r.prompt_id].thumbs_up++
    else if (r.emoji === 'heart') reactionsMap[r.prompt_id].heart++
    else if (r.emoji === 'rocket') reactionsMap[r.prompt_id].rocket++
  }

  // Fetch comment counts (exclude deleted if desired — spec doesn't say, include all)
  const commentRows = await db
    .select({ id: schema.comments.id, prompt_id: schema.comments.prompt_id })
    .from(schema.comments)
    .where(inArray(schema.comments.prompt_id, promptIds))
  const commentCountMap: Record<string, number> = {}
  for (const id of promptIds) commentCountMap[id] = 0
  for (const cm of commentRows) commentCountMap[cm.prompt_id]++

  // Viewer-specific data (only when authenticated)
  let viewerReactionMap: Record<string, string | null> = {}
  let viewerBookmarkedMap: Record<string, boolean> = {}
  if (user) {
    const viewerReactions = await db
      .select()
      .from(schema.reactions)
      .where(and(eq(schema.reactions.user_id, user.id), inArray(schema.reactions.prompt_id, promptIds)))
    for (const id of promptIds) viewerReactionMap[id] = null
    for (const r of viewerReactions) viewerReactionMap[r.prompt_id] = r.emoji

    const viewerBookmarks = await db
      .select()
      .from(schema.bookmarks)
      .where(and(eq(schema.bookmarks.user_id, user.id), inArray(schema.bookmarks.prompt_id, promptIds)))
    for (const id of promptIds) viewerBookmarkedMap[id] = false
    for (const b of viewerBookmarks) viewerBookmarkedMap[b.prompt_id] = true
  }

  const data = rows.map((p) =>
    buildSummaryItem(
      p,
      tagsMap[p.id] ?? [],
      authorsMap[p.author_id],
      reactionsMap[p.id] ?? { thumbs_up: 0, heart: 0, rocket: 0 },
      commentCountMap[p.id] ?? 0,
      user
        ? { viewer_reaction: viewerReactionMap[p.id] ?? null, viewer_bookmarked: viewerBookmarkedMap[p.id] ?? false }
        : undefined,
    ),
  )

  return c.json({ data, next_cursor: nextCursor })
})

// ---------------------------------------------------------------------------
// GET /prompts/:id — API-02
// ---------------------------------------------------------------------------
app.get('/:id', optionalAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')
  const { id } = c.req.param()

  const [prompt] = await db
    .select()
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)

  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // Visibility: flagged/hidden are never visible; drafts only visible to author
  const isVisible =
    prompt.status === 'published' ||
    (!!user && user.id === prompt.author_id && prompt.status === 'draft')

  if (!isVisible) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // Tags
  const tagRows = await db
    .select()
    .from(schema.prompt_tags)
    .where(eq(schema.prompt_tags.prompt_id, id))
  const tags = tagRows.map((t) => t.tag)

  // Author
  const [author] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, prompt.author_id))
    .limit(1)

  // Reactions
  const reactionRows = await db
    .select()
    .from(schema.reactions)
    .where(eq(schema.reactions.prompt_id, id))
  const reaction_counts = { thumbs_up: 0, heart: 0, rocket: 0 }
  for (const r of reactionRows) {
    if (r.emoji === 'thumbs_up') reaction_counts.thumbs_up++
    else if (r.emoji === 'heart') reaction_counts.heart++
    else if (r.emoji === 'rocket') reaction_counts.rocket++
  }

  // Comment count
  const commentRows = await db
    .select({ id: schema.comments.id })
    .from(schema.comments)
    .where(eq(schema.comments.prompt_id, id))
  const comment_count = commentRows.length

  const item: Record<string, unknown> = {
    id: prompt.id,
    title: prompt.title,
    body: prompt.body,
    category: prompt.category,
    model: prompt.model,
    difficulty: prompt.difficulty,
    status: prompt.status,
    tags,
    author: author ? { login: author.github_login, avatar_url: author.avatar_url } : null,
    reaction_counts,
    comment_count,
    created_at: prompt.created_at,
    updated_at: prompt.updated_at,
  }

  if (user) {
    const [viewerReaction] = await db
      .select()
      .from(schema.reactions)
      .where(and(eq(schema.reactions.prompt_id, id), eq(schema.reactions.user_id, user.id)))
      .limit(1)
    const [viewerBookmark] = await db
      .select()
      .from(schema.bookmarks)
      .where(and(eq(schema.bookmarks.prompt_id, id), eq(schema.bookmarks.user_id, user.id)))
      .limit(1)
    item.viewer_reaction = viewerReaction ? viewerReaction.emoji : null
    item.viewer_bookmarked = !!viewerBookmark
  }

  return c.json(item)
})

// ---------------------------------------------------------------------------
// GET /prompts/:id/versions — API-03
// ---------------------------------------------------------------------------
app.get('/:id/versions', async (c) => {
  const db = drizzle(c.env.DB)
  const { id } = c.req.param()

  // Verify the prompt exists
  const [prompt] = await db
    .select({ id: schema.prompts.id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  const { cursor, limit: limitParam } = c.req.query()
  const limit = limitParam ? parseInt(limitParam, 10) : 20
  if (isNaN(limit) || limit > 100) {
    return c.json({ error: 'invalid_limit', code: 'invalid_limit' }, 400)
  }

  const conditions: ReturnType<typeof eq>[] = [eq(schema.prompt_versions.prompt_id, id)]
  if (cursor) conditions.push(gt(schema.prompt_versions.id, cursor))

  // Fetch versions joined with authors
  const rows = await db
    .select({
      id: schema.prompt_versions.id,
      version_number: schema.prompt_versions.version_number,
      changelog: schema.prompt_versions.changelog,
      author_id: schema.prompt_versions.author_id,
      created_at: schema.prompt_versions.created_at,
      author_login: schema.users.github_login,
    })
    .from(schema.prompt_versions)
    .innerJoin(schema.users, eq(schema.prompt_versions.author_id, schema.users.id))
    .where(and(...conditions))
    .orderBy(asc(schema.prompt_versions.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? sliced[sliced.length - 1].id : null

  const data = sliced.map((v) => ({
    id: v.id,
    version_number: v.version_number,
    changelog: v.changelog,
    author: { login: v.author_login },
    created_at: v.created_at,
  }))

  return c.json({ data, next_cursor: nextCursor })
})

// ---------------------------------------------------------------------------
// GET /prompts/:id/comments — API-04
// ---------------------------------------------------------------------------
app.get('/:id/comments', async (c) => {
  const db = drizzle(c.env.DB)
  const { id } = c.req.param()

  // Verify the prompt exists
  const [prompt] = await db
    .select({ id: schema.prompts.id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  const { cursor, limit: limitParam } = c.req.query()
  const limit = limitParam ? parseInt(limitParam, 10) : 20
  if (isNaN(limit) || limit > 100) {
    return c.json({ error: 'invalid_limit', code: 'invalid_limit' }, 400)
  }

  const conditions: ReturnType<typeof eq>[] = [eq(schema.comments.prompt_id, id)]
  if (cursor) conditions.push(gt(schema.comments.id, cursor))

  // Fetch comments left-joined with authors (author may be deleted)
  const rows = await db
    .select({
      id: schema.comments.id,
      body: schema.comments.body,
      deleted_at: schema.comments.deleted_at,
      created_at: schema.comments.created_at,
      author_login: schema.users.github_login,
      author_avatar: schema.users.avatar_url,
    })
    .from(schema.comments)
    .leftJoin(schema.users, eq(schema.comments.author_id, schema.users.id))
    .where(and(...conditions))
    .orderBy(asc(schema.comments.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? sliced[sliced.length - 1].id : null

  const data = sliced.map((cmt) => {
    const isDeleted = !!cmt.deleted_at
    return {
      id: cmt.id,
      body: isDeleted ? '[deleted]' : cmt.body,
      author: isDeleted
        ? null
        : cmt.author_login
          ? { login: cmt.author_login, avatar_url: cmt.author_avatar }
          : null,
      created_at: cmt.created_at,
    }
  })

  return c.json({ data, next_cursor: nextCursor })
})

// ---------------------------------------------------------------------------
// POST /prompts — API-11: Create a draft prompt
// ---------------------------------------------------------------------------
app.post('/', requireAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')!

  const body = await c.req.json().catch(() => null)
  if (!body) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }

  // Validate required fields
  const title = body.title
  const promptBody = body.body

  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }
  if (!promptBody || typeof promptBody !== 'string' || promptBody.trim().length === 0) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }

  // Validate tags
  const tags: string[] = Array.isArray(body.tags) ? body.tags : []
  if (tags.length > 5) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }

  const id = ulid()
  const [prompt] = await db
    .insert(schema.prompts)
    .values({
      id,
      author_id: user.id,
      title: title.trim(),
      body: promptBody,
      category: body.category ?? null,
      model: body.model ?? null,
      difficulty: body.difficulty ?? null,
      status: 'draft', // always draft on creation, ignoring any status in body
    })
    .returning()

  // Insert tags if provided
  if (tags.length > 0) {
    await db.insert(schema.prompt_tags).values(tags.map((tag) => ({ prompt_id: id, tag })))
  }

  return c.json(
    {
      id: prompt.id,
      title: prompt.title,
      body: prompt.body,
      category: prompt.category,
      model: prompt.model,
      difficulty: prompt.difficulty,
      status: prompt.status,
      tags,
      author: { login: user.login },
      created_at: prompt.created_at,
      updated_at: prompt.updated_at,
    },
    201,
  )
})

// ---------------------------------------------------------------------------
// PATCH /prompts/:id — API-12: Update prompt fields (author or maintainer only)
// ---------------------------------------------------------------------------
app.patch('/:id', requireAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')!
  const { id } = c.req.param()

  // Load the prompt
  const [prompt] = await db.select().from(schema.prompts).where(eq(schema.prompts.id, id)).limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // Auth check: must be author or maintainer
  if (user.id !== prompt.author_id && user.role !== 'maintainer') {
    return c.json({ error: 'forbidden', code: 'forbidden' }, 403)
  }

  const body = await c.req.json().catch(() => null)
  if (!body) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }

  // Status transition check: only maintainer can set flagged or hidden
  if (body.status !== undefined) {
    if ((body.status === 'flagged' || body.status === 'hidden') && user.role !== 'maintainer') {
      return c.json({ error: 'forbidden', code: 'forbidden' }, 403)
    }
  }

  // Build update object from allowed writable fields
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.body !== undefined) updates.body = body.body
  if (body.category !== undefined) updates.category = body.category
  if (body.model !== undefined) updates.model = body.model
  if (body.difficulty !== undefined) updates.difficulty = body.difficulty
  if (body.status !== undefined) updates.status = body.status

  // Always update updated_at when any change is requested
  updates.updated_at = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
  await db
    .update(schema.prompts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(schema.prompts.id, id))

  // Handle tag replacement
  if (body.tags !== undefined) {
    const newTags: string[] = Array.isArray(body.tags) ? body.tags : []
    await db.delete(schema.prompt_tags).where(eq(schema.prompt_tags.prompt_id, id))
    if (newTags.length > 0) {
      await db.insert(schema.prompt_tags).values(newTags.map((tag) => ({ prompt_id: id, tag })))
    }
  }

  // Re-fetch the updated prompt
  const [updated] = await db.select().from(schema.prompts).where(eq(schema.prompts.id, id)).limit(1)
  const tagRows = await db.select().from(schema.prompt_tags).where(eq(schema.prompt_tags.prompt_id, id))
  const tags = tagRows.map((t) => t.tag)

  return c.json({
    id: updated.id,
    title: updated.title,
    body: updated.body,
    category: updated.category,
    model: updated.model,
    difficulty: updated.difficulty,
    status: updated.status,
    tags,
    author: { login: user.login },
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  })
})

// ---------------------------------------------------------------------------
// DELETE /prompts/:id — API-13: Hard delete prompt and all dependents
// ---------------------------------------------------------------------------
app.delete('/:id', requireAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')!
  const { id } = c.req.param()

  // Load the prompt
  const [prompt] = await db
    .select({ id: schema.prompts.id, author_id: schema.prompts.author_id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // Auth check: must be author or maintainer
  if (user.id !== prompt.author_id && user.role !== 'maintainer') {
    return c.json({ error: 'forbidden', code: 'forbidden' }, 403)
  }

  // Delete in FK dependency order (moderation_log is intentionally kept)
  await db.delete(schema.notifications).where(eq(schema.notifications.prompt_id, id))
  await db.delete(schema.reactions).where(eq(schema.reactions.prompt_id, id))
  await db.delete(schema.bookmarks).where(eq(schema.bookmarks.prompt_id, id))
  await db.delete(schema.comments).where(eq(schema.comments.prompt_id, id))
  await db.delete(schema.prompt_tags).where(eq(schema.prompt_tags.prompt_id, id))
  await db.delete(schema.prompt_versions).where(eq(schema.prompt_versions.prompt_id, id))
  await db.delete(schema.prompts).where(eq(schema.prompts.id, id))

  return new Response(null, { status: 204 })
})

// ---------------------------------------------------------------------------
// POST /prompts/:id/versions — API-14
// Publish a new version record for this prompt
// IMPORTANT: Must be registered BEFORE /:id/versions/:n/restore to avoid routing conflicts
// ---------------------------------------------------------------------------
app.post('/:id/versions', requireAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')!
  const { id } = c.req.param()

  // 1. Verify the prompt exists
  const [prompt] = await db
    .select({ id: schema.prompts.id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // 2. Parse and validate body
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.body !== 'string' || body.body.trim() === '') {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }

  // 3. Compute next version number: MAX(version_number) + 1 (starts at 1 if no versions exist)
  const maxVersionRow = await db
    .select({ max: sql<number>`MAX(version_number)` })
    .from(schema.prompt_versions)
    .where(eq(schema.prompt_versions.prompt_id, id))
  const nextVersionNumber = (maxVersionRow[0]?.max ?? 0) + 1

  // 4. Insert new version
  const newVersionId = ulid()
  const changelog = typeof body.changelog === 'string' ? body.changelog : null
  await db.insert(schema.prompt_versions).values({
    id: newVersionId,
    prompt_id: id,
    version_number: nextVersionNumber,
    body: body.body as string,
    changelog,
    author_id: user.id,
  })

  // 5. Return 201 with version object
  return c.json(
    {
      id: newVersionId,
      version_number: nextVersionNumber,
      changelog,
      author: { login: user.login },
      created_at: new Date().toISOString(),
    },
    201,
  )
})

// ---------------------------------------------------------------------------
// POST /prompts/:id/versions/:n/restore — API-15
// Non-destructive restore: create a new version from version N's body
// ---------------------------------------------------------------------------
app.post('/:id/versions/:n/restore', requireAuth(), async (c) => {
  const db = drizzle(c.env.DB)
  const user = c.get('user')!
  const { id, n } = c.req.param()

  // 1. Validate n is a valid integer
  const versionNumber = parseInt(n, 10)
  if (isNaN(versionNumber)) {
    return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  }

  // 2. Look up the prompt — 404 if not found
  const [prompt] = await db
    .select({ id: schema.prompts.id })
    .from(schema.prompts)
    .where(eq(schema.prompts.id, id))
    .limit(1)
  if (!prompt) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // 3. Look up the source version by version_number — 404 if not found
  const [sourceVersion] = await db
    .select()
    .from(schema.prompt_versions)
    .where(
      and(
        eq(schema.prompt_versions.prompt_id, id),
        eq(schema.prompt_versions.version_number, versionNumber),
      ),
    )
    .limit(1)
  if (!sourceVersion) {
    return c.json({ error: 'not_found', code: 'not_found' }, 404)
  }

  // 4. Compute next version number: MAX(version_number) + 1
  const maxVersionRow = await db
    .select({ max: sql<number>`MAX(version_number)` })
    .from(schema.prompt_versions)
    .where(eq(schema.prompt_versions.prompt_id, id))
  const nextVersionNumber = (maxVersionRow[0]?.max ?? 0) + 1

  // 5. Insert new version with source body and auto-generated changelog
  const newVersionId = ulid()
  const changelog = `Restored from version ${versionNumber}`
  await db.insert(schema.prompt_versions).values({
    id: newVersionId,
    prompt_id: id,
    version_number: nextVersionNumber,
    body: sourceVersion.body,
    changelog,
    author_id: user.id,
  })

  // 6. Return 201 with new version object
  return c.json(
    {
      id: newVersionId,
      version_number: nextVersionNumber,
      changelog,
      author: { login: user.login },
      created_at: new Date().toISOString(),
    },
    201,
  )
})

export default app
