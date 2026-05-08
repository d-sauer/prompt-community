# Phase 12: Write API - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement all mutating operations (POST/PATCH/DELETE) for prompts, versions, comments, reactions, bookmarks, and notifications — authenticated Hono endpoints backed by D1. Route stubs exist for comments, reactions, and notifications; the bookmarks route file does not exist yet and must be created and mounted.

**In scope (Phase 12):**
- `POST /prompts` — create a draft prompt
- `PATCH /prompts/:id` — update any writable field (title, body, category, model, difficulty, tags, status), author only
- `DELETE /prompts/:id` — hard delete prompt + all dependents (author or maintainer)
- `POST /prompts/:id/versions` — publish a new version record
- `POST /prompts/:id/versions/:n/restore` — non-destructive restore (creates a new version from a prior one)
- `POST /prompts/:id/comments` — create a comment, auto-create notification for prompt author
- `DELETE /comments/:id` — soft delete (sets deleted_at), author or maintainer
- `POST /prompts/:id/reactions` — add an emoji reaction, auto-create notification for prompt author
- `DELETE /prompts/:id/reactions` — remove a specific emoji reaction (emoji specified in request body)
- `POST /bookmarks` and `DELETE /bookmarks/:promptId` — server-side bookmark management
- `POST /notifications/:id/read` — mark a single notification as read (API-21)

**Out of scope for Phase 12:**
- Admin moderation endpoints (Phase 14)
- Frontend rewire (Phase 13)
- Bulk mark-all-notifications-read (deferred)

</domain>

<decisions>
## Implementation Decisions

### Prompt Status Lifecycle
- `POST /prompts` always creates with `status: 'draft'` — author reviews before publishing
- `PATCH /prompts/:id` accepts all writable fields as a partial update: `title`, `body`, `category`, `model`, `difficulty`, `tags`, `status`
- Author-allowed status transitions: `draft → published` and `published → draft` only
- Flagging and hiding are admin-only transitions; a non-maintainer setting `status: 'flagged'` or `status: 'hidden'` should receive 403
- No separate publish endpoint — status is part of the same PATCH body

### Notification Triggers
- `POST /prompts/:id/comments` auto-inserts a `notifications` row for the prompt author
- `POST /prompts/:id/reactions` auto-inserts a `notifications` row for the prompt author
- Skip self-notifications: if the actor is the prompt author, do not create a notification row
- Notification type values: `comment_added` (for comments), `reaction_added` (for reactions)
- `comment_id` is populated for `comment_added`; `null` for `reaction_added`
- `POST /notifications/:id/read` sets `read_at` to the current timestamp; returns 200 with the updated notification object

### Prompt Delete Cascade
- `DELETE /prompts/:id` hard-deletes the prompt row plus all dependent rows: `comments`, `reactions`, `bookmarks`, `prompt_versions`, `notifications`
- `moderation_log` rows for the deleted prompt are **kept** — preserve the audit trail even after the prompt is gone
- Returns `204 No Content` on success

### Comment Delete
- `DELETE /comments/:id` is a **soft delete** — sets `deleted_at` to the current timestamp
- Consistent with Phase 11's existing rendering: soft-deleted comments appear as `{ body: '[deleted]', author: null }`
- Returns `204 No Content` on success
- Author or maintainer can delete; 403 otherwise

### Reaction Duplicate Handling
- The reactions schema has composite PK `(prompt_id, user_id, emoji)` — a user can hold `thumbs_up`, `heart`, and `rocket` independently on the same prompt (one per emoji type)
- Posting an emoji the user already has on that prompt → `409 Conflict { error: 'already_reacted', code: 'already_reacted' }`
- `DELETE /prompts/:id/reactions` requires `{ emoji: 'thumbs_up' | 'heart' | 'rocket' }` in the request body to identify which reaction to remove
- `POST /prompts/:id/reactions` returns `201` with the full updated `reaction_counts` object `{ thumbs_up, heart, rocket }` — frontend can update UI without a refetch
- `DELETE /prompts/:id/reactions` returns `204 No Content`

### Claude's Discretion
- Exact request body validation (Zod / manual checks / Hono's built-in validator) — just ensure malformed payloads return `422 { error, code }`
- Whether `PATCH /prompts/:id` returns the full updated prompt or just `200 { id }`
- Version number auto-increment logic for `POST /prompts/:id/versions`
- Restore endpoint changelog auto-text (e.g., "Restored from version N")
- Tag max-5 enforcement details (reject with 422 if `tags.length > 5`)
- Bookmarks route file name and mount point — create `src/workers/api/routes/bookmarks.ts` and mount at `app.route('/bookmarks', bookmarks)` in `index.ts`
- Whether to wrap the hard-delete cascade in a D1 transaction

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/workers/api/routes/prompts.ts` — GET handlers fully implemented; Phase 12 adds `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/versions`, `POST /:id/versions/:n/restore`, `POST /:id/comments`, `POST /:id/reactions`, `DELETE /:id/reactions` sub-routes to the same Hono app
- `src/workers/api/routes/comments.ts` — single `app.all('*', 501)` stub; Phase 12 replaces with `DELETE /:id`
- `src/workers/api/routes/reactions.ts` — single `app.all('*', 501)` stub; Phase 12 replaces (note: reactions are mounted at `/reactions` but the actual write endpoints are `/prompts/:id/reactions` — verify mount point in `index.ts`)
- `src/workers/api/routes/notifications.ts` — `GET /` fully implemented; Phase 12 adds `POST /:id/read`
- `src/workers/api/middleware/auth.ts` — `requireAuth` and `optionalAuth` fully implemented
- `src/workers/api/db/schema.ts` — all 10 tables defined; `reactions` PK is `(prompt_id, user_id, emoji)`

### Established Patterns
- `c.env.DB` — D1 binding in all route handlers
- `c.get('user')` — user attached by `requireAuth`; `user.id` and `user.role` available
- Error envelope: `{ error: string, code: string }` — use consistently for all error responses
- `requireAuth()` returns `401 { error: 'unauthorized', code: 'token_missing' | 'token_expired' }` automatically
- ULID primary keys — use `ulid()` or equivalent for new row IDs

### Integration Points
- All routes already mounted in `index.ts` except bookmarks — add `app.route('/bookmarks', bookmarks)` in Phase 12
- `src/workers/api/routes/comments.ts` is mounted at `/comments`; `DELETE /comments/:id` handler goes here
- Reaction write endpoints (`POST /prompts/:id/reactions`, `DELETE /prompts/:id/reactions`) live in `prompts.ts` alongside the GET handlers — not in `reactions.ts` (which appears unused for write paths)

</code_context>

<specifics>
## Specific Ideas

- Reaction POST returns the updated `reaction_counts` inline — avoids a frontend refetch and keeps the optimistic update simple
- Notification creation is a side effect inside the comment/reaction handler — not a separate API call
- `DELETE /prompts/:id` cascade should delete in dependency order to avoid FK issues: notifications → reactions → bookmarks → comments → prompt_versions → prompts
- Soft-deleted comments (`deleted_at IS NOT NULL`) already render correctly in Phase 11's GET handler — no change needed there

</specifics>

<deferred>
## Deferred Ideas

- `POST /notifications/read-all` (bulk mark-all-read) — deferred; not in API-21 scope; add if Phase 13 needs it
- Reactions on comments (not prompts) — not in the v2.0 schema; future milestone
- Draft collaboration / co-author workflow — out of v2.0 scope

</deferred>

---

*Phase: 12-write-api*
*Context gathered: 2026-05-08*
