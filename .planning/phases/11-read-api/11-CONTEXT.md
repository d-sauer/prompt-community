# Phase 11: Read API - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement all 10 GET endpoints (API-01 through API-10) and FTS5 server-side search (SEARCH-01, SEARCH-02). This is a backend-only phase — no frontend changes (Phase 13 rewires the frontend). Route stubs already exist in `src/workers/api/routes/`; this phase fills them in with real Drizzle queries.

**In scope:**
- `GET /prompts` — paginated listing with filters
- `GET /prompts/:id` — single prompt detail with tags, author, reaction counts
- `GET /prompts/:id/versions` — version history
- `GET /prompts/:id/comments` — comments with soft-delete handling
- `GET /search?q=` — FTS5 full-text search
- `GET /users/:login` — public user profile
- `GET /users/:login/prompts` — user's submissions
- `GET /users/:login/activity` — user's activity feed
- `GET /labels` — taxonomy listing
- `GET /notifications` — current user's notifications (auth required)
- FTS5 virtual table and sync triggers (SEARCH-01, from Phase 9 schema foundation)

**Out of scope for Phase 11:**
- All write endpoints (Phase 12)
- Admin endpoints (Phase 14)
- Frontend rewire from `src/lib/github/*` → `src/lib/api/*` (Phase 13)
- MiniSearch client-side index retention (Phase 13)

</domain>

<decisions>
## Implementation Decisions

### Pagination
- **Cursor-based pagination** on all list endpoints — `?cursor=<last_ulid>&limit=20`
- Response envelope: `{ data: [...], next_cursor: 'ULID...' | null }` — `next_cursor` is null when no more pages
- Default page size: 20; maximum: 100 — reject `limit > 100` with 400
- Same cursor pattern applies to `GET /users/:login/prompts` and `GET /users/:login/activity` — consistent across all list endpoints
- ULID natural sort order used for cursor (already indexed via `prompts_created_at_idx`)

### Response Shapes

**`GET /prompts` listing item (no body — summary only):**
```
{
  id, title, category, model, difficulty, status, tags: string[],
  author: { login, avatar_url },
  reaction_counts: { thumbs_up: N, heart: N, rocket: N },
  comment_count: N,
  created_at, updated_at,
  // when optionalAuth user present:
  viewer_reaction: 'thumbs_up' | 'heart' | 'rocket' | null,
  viewer_bookmarked: boolean
}
```

**`GET /prompts/:id` (detail):**
Same as listing item plus full `body` field. Per-emoji reaction counts (not totals).

**`GET /prompts/:id/versions`:**
`{ data: [{ id, version_number, changelog, author: { login }, created_at }], next_cursor }`
No body in version list — large content, fetched on demand.

**`GET /prompts/:id/comments`:**
`{ data: [{ id, author: { login, avatar_url } | null, body, created_at }], next_cursor }`
Soft-deleted comments appear as `{ body: '[deleted]', author: null }` — preserves thread continuity.

**`GET /users/:login/activity`:**
`{ data: [{ type: 'prompt_created', prompt: { id, title, created_at } }], next_cursor }`
Only `prompt_created` events — no comments, reactions, or bookmarks in the feed.

**`GET /notifications`:**
`{ data: [{ id, type, prompt_id, comment_id, read_at, created_at }], next_cursor }`

### Authentication Tiers
- **Public + optionalAuth:** `GET /prompts`, `GET /prompts/:id`
  - Unauthenticated: no viewer fields
  - Authenticated: embed `viewer_reaction` and `viewer_bookmarked` in response
- **Public (no auth at all):** `GET /prompts/:id/versions`, `GET /prompts/:id/comments`, `GET /users/:login`, `GET /users/:login/prompts`, `GET /users/:login/activity`, `GET /labels`, `GET /search`
- **requireAuth:** `GET /notifications` only

### Prompt Visibility
- `GET /prompts` and `GET /search` return only `status = 'published'` prompts for unauthenticated callers
- Authors can see their own `draft` prompts — implement as: if `optionalAuth` user is present and matches `author_id`, include drafts for that user (Claude's discretion on exact implementation)
- `flagged` and `hidden` prompts never appear in public listings

### FTS5 Search
- Searches all three indexed fields: `title`, `body`, `tags`
- Response shape: identical to `GET /prompts` listing (same summary shape, same cursor envelope) — no snippets or highlighting
- Minimum query length: 2 characters — return `400 { error: 'query_too_short', code: 'query_too_short' }` if `q` is shorter
- `GET /search?q=` with no `q` param: return `400 { error: 'missing_query', code: 'missing_query' }`
- No fallback to LIKE — FTS5 only; MiniSearch handles offline

### Error Envelope
- Carry forward from Phase 10: `{ error: string, code: string }` for all error responses
- 404 for unknown prompt/user IDs: `{ error: 'not_found', code: 'not_found' }`

### Claude's Discretion
- Exact Drizzle query structure (joins, subqueries, group-by for counts)
- Whether to use a DB helper/repository pattern or inline queries in route handlers
- Exact `ORDER BY` clause for versions (version_number DESC is obvious; Claude chooses)
- How to implement the FTS5 sync triggers (content-table mode already chosen in Phase 9; Phase 11 wires the INSERT INTO fts5 calls)
- Notification type enum values
- Whether `GET /labels` returns a flat list or grouped by prefix (category / model / difficulty / tag)
- HTTP cache headers on read endpoints (e.g., `Cache-Control: public, max-age=60` on `/labels`)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/workers/api/routes/prompts.ts` — stub exists, single `app.all('*', 501)` to replace
- `src/workers/api/routes/users.ts` — stub exists
- `src/workers/api/routes/search.ts` — stub exists
- `src/workers/api/routes/comments.ts` — stub exists (Phase 11 adds GET, Phase 12 adds POST/DELETE)
- `src/workers/api/middleware/auth.ts` — `requireAuth` and `optionalAuth` fully implemented (Phase 10)
- `src/workers/api/db/schema.ts` — all 10 tables defined with Drizzle; indexes on `prompts.author_id`, `prompts.status`, `prompts.created_at`
- `src/workers/api/db/migrations/0002_fts5.sql` — FTS5 virtual table + sync triggers already created in Phase 9

### Established Patterns
- `c.env.DB` — D1 binding available in all route handlers via Hono context
- `c.get('user')` — user context attached by `requireAuth` or `optionalAuth`; null if unauthenticated
- `{ error: '...', code: '...' }` — error envelope established in Phase 10 (401/403 responses)
- ULID primary keys — natural time-ordered sort, cursor pagination uses `WHERE id > ?cursor ORDER BY id ASC`
- `optionalAuth` from Phase 10 handles the unauthenticated/authenticated response branching on public routes

### Integration Points
- `app.route('/prompts', prompts)` — already registered in `index.ts`
- `app.route('/users', users)` — already registered
- `app.route('/search', search)` — already registered
- `app.route('/comments', comments)` — already registered (Phase 11 adds the GET sub-routes)
- `/notifications` route: currently not mounted — Phase 11 creates the route and mounts it in `index.ts`
- FTS5 table name: `prompts_fts` (from Phase 9 migration) — `SELECT * FROM prompts_fts WHERE prompts_fts MATCH ?`

</code_context>

<specifics>
## Specific Ideas

- `viewer_reaction` and `viewer_bookmarked` fields on listing/detail responses are the key UX win from `optionalAuth` — the frontend can render reaction buttons and bookmark state in a single fetch
- Soft-deleted comment shape `{ body: '[deleted]', author: null }` — the `deleted_at` IS NOT NULL check drives this; no separate `is_deleted` flag needed
- Activity feed returns only `prompt_created` type — UNION or simple prompts query filtered by author; no separate activity log table needed
- Cursor implementation: `WHERE id > :cursor ORDER BY id ASC LIMIT :limit` — if result count equals limit, there may be a next page; set `next_cursor` to last item's id

</specifics>

<deferred>
## Deferred Ideas

- Search snippets / FTS5 `snippet()` highlighting — out of scope for v2.0; same-shape response keeps Phase 13 frontend simple
- Total count in pagination meta (`meta.total`) — requires extra COUNT(*) query; deferred unless Phase 13 explicitly needs it
- Reactions on comments (not prompts) — not in the v2.0 schema; future milestone
- `GET /users/:login/bookmarks` — bookmarks are private; deferred to a future phase if needed
- Author can see own drafts in listing — mentioned above as Claude's discretion; if complex, defer to Phase 12 (write API) where draft management logic lives

</deferred>

---

*Phase: 11-read-api*
*Context gathered: 2026-05-06*
