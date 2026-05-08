# Phase 14: Admin & Moderation API - Research

**Researched:** 2026-05-08
**Domain:** Hono admin route handlers, D1 moderation_log, label CRUD, frontend admin composable rewire
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| API-22 | `GET /admin/queue` — returns flagged prompts (maintainer only) | D1 query on `prompts` WHERE status='flagged'; requireAuth+requireMaintainer middleware already exists |
| API-23 | `GET /admin/log` — returns moderation log (maintainer only) | D1 query on `moderation_log` joined with users and prompts; table already in schema |
| API-24 | `POST /admin/prompts/:id/approve` — approves flagged prompt, logs action | UPDATE prompts SET status='published' + INSERT moderation_log; established write pattern |
| API-25 | `POST /admin/prompts/:id/hide` — hides a prompt, logs action | UPDATE prompts SET status='hidden' + INSERT moderation_log; same pattern as approve |
| API-26 | `POST /labels`, `PATCH /labels/:id`, `DELETE /labels/:id` — label CRUD (maintainer only) | labels table exists and is seeded; GET /labels already implemented in labels.ts; extend with write handlers |
| API-27 | Consistent JSON error shape across ALL API endpoints | Error shape `{ error: string, code: string }` already used throughout; need to audit for any gaps and document it formally |
| API-28 | All admin and write routes guarded by JWT + role middleware | requireAuth + requireMaintainer compose pattern verified in role.spec.ts; admin.ts stub already wired at /admin |
| FRONT-06 | `src/lib/api/admin.ts` created; admin composables rewired away from `@/lib/github/*` | Four composables currently import from `@/lib/github/*`; apiFetch is the approved pattern; specs need to be rewritten |
</phase_requirements>

---

## Summary

Phase 14 is the final backend feature phase before decommission. Its scope is narrow and precise: implement the stubbed `/admin` route module, extend the existing `labels.ts` route with write handlers, and rewire four frontend admin composables from the legacy GitHub API to the new Hono backend via `src/lib/api/admin.ts`.

All infrastructure is already in place. The `requireAuth` and `requireMaintainer` middleware are implemented and tested. The `moderation_log` table exists in the Drizzle schema with no cascade deletes (preserves audit trail intentionally). The `labels` table is seeded. The `admin.ts` route stub is mounted at `/admin`. The `apiFetch` primitive and the `@/lib/api/http.ts` module are in production use.

The only genuinely new work is: (1) filling in six handler functions in `src/workers/api/routes/admin.ts`, (2) adding three write handlers to `src/workers/api/routes/labels.ts`, (3) auditing and standardising the `{ error, code }` response shape across all routes, and (4) creating `src/lib/api/admin.ts` and updating the four composables that still import from `@/lib/github/*`.

**Primary recommendation:** Follow the TDD-RED → implement → GREEN cycle established in Phases 11 and 12. Write `admin.spec.ts` first covering all six admin endpoint behaviours, then fill in the route handlers, then port the frontend composables.

---

## Standard Stack

### Core (no new dependencies required)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| hono | already installed | Route handlers, middleware composition | `requireAuth + requireMaintainer` already implemented |
| drizzle-orm/d1 | already installed | D1 database access | All tables (moderation_log, labels, prompts) already in schema |
| ulid | already installed | ID generation for new moderation_log rows | Pattern established in write.ts |
| @tanstack/vue-query | already installed | Frontend data fetching (useQuery, useMutation) | All admin composables already use this |

No new packages are needed for this phase.

---

## Architecture Patterns

### Recommended File Changes

```
src/workers/api/routes/
├── admin.ts           # Currently a 501 stub — Phase 14 fills all handlers
└── labels.ts          # Currently GET only — add POST, PATCH, DELETE handlers

src/lib/api/
└── admin.ts           # NEW — apiFetch wrappers for all admin endpoints (FRONT-06)

src/composables/queries/
├── useAdminQueue.ts   # Rewire: remove @/lib/github/octokit, import from @/lib/api/admin
├── useAdminActions.ts # Rewire: remove @/lib/github/mutations, import from @/lib/api/admin
├── useAdminLog.ts     # Rewire: remove @/lib/github/queries+octokit, import from @/lib/api/admin
└── useAdminLabels.ts  # Rewire: remove @/lib/github/mutations+queries+etag, import from @/lib/api/admin
                       # (useAdminStats.ts — remove GitHub GraphQL, derive from queue count)
```

### Pattern 1: Admin Route Handler with requireAuth + requireMaintainer

The middleware composition is already tested and verified in `role.spec.ts`. Apply both in sequence:

```typescript
// Source: src/workers/api/middleware/role.ts (verified working)
app.get('/', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB)
  // handler body
})
```

**IMPORTANT:** `requireAuth` must come before `requireMaintainer`. If `requireMaintainer` runs first on an unauthenticated request, it sees `user = null` and returns 403 when 401 is more correct. The established convention in `role.spec.ts` shows `requireAuth()` always chains first.

### Pattern 2: Admin Queue — GET /admin/queue

Query `prompts` WHERE status = 'flagged', join with users for author data, include tags.

```typescript
// Pattern derived from GET /prompts (prompts.ts) — reuse the established inArray batch approach
const flaggedPrompts = await db
  .select()
  .from(schema.prompts)
  .where(eq(schema.prompts.status, 'flagged'))
  .orderBy(desc(schema.prompts.created_at))
  .limit(limit + 1)
```

Author JOIN and tag batch query follow the same pattern as Phase 11's `GET /prompts`. No new patterns needed.

### Pattern 3: Moderation Actions — POST /admin/prompts/:id/approve and /hide

Two-step operation: update prompt status + insert moderation_log record. Use the `ulid()` import already present.

```typescript
// Pattern established in write handlers (prompts.ts)
const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

await db.update(schema.prompts)
  .set({ status: 'published', updated_at: now })
  .where(eq(schema.prompts.id, id))

await db.insert(schema.moderation_log).values({
  id: ulid(),
  prompt_id: id,
  actor_id: user.id,
  action: 'approve',  // or 'hide'
  reason: body.reason ?? null,
})
```

**Moderation log note from schema:** `moderation_log` FKs have NO onDelete cascade — this is intentional (Phase 9 decision) to preserve the audit trail even when the prompt or user is deleted.

### Pattern 4: Label Write Handlers

`POST /labels` validates prefix:value format, inserts using the established pattern. `PATCH /labels/:id` updates. `DELETE /labels/:id` deletes.

```typescript
// Extend labels.ts — add write handlers after existing GET /
app.post('/', requireAuth(), requireMaintainer(), async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'validation_error', code: 'validation_error' }, 422)
  // validate prefix, value fields
  const id = ulid()
  await db.insert(schema.labels).values({ id, prefix: body.prefix, value: body.value, color: body.color ?? null, description: body.description ?? null })
  const [row] = await db.select().from(schema.labels).where(eq(schema.labels.id, id)).limit(1)
  return c.json(row, 201)
})
```

**Cache-Control consideration:** `GET /labels` currently sets `Cache-Control: public, max-age=300`. Write operations (POST/PATCH/DELETE) should NOT set this header. No action needed — only the GET handler sets it.

### Pattern 5: Frontend admin.ts — apiFetch wrappers

Follow the exact same shape as `src/lib/api/queries.ts` and `src/lib/api/mutations.ts`. The `apiFetch` primitive handles credentials, base URL, and error parsing.

```typescript
// src/lib/api/admin.ts — NEW file following established pattern
import { apiFetch } from './http'

export interface FlaggedPrompt {
  id: string
  title: string
  status: 'flagged'
  author: { login: string; avatar_url: string | null }
  created_at: string
}

export interface LogEntry {
  id: string
  action: string
  reason: string | null
  actor: { login: string }
  prompt: { id: string; title: string }
  created_at: string
}

export interface AdminLabel {
  id: string
  prefix: string
  value: string
  color: string | null
  description: string | null
}

export function getAdminQueue(params?: { cursor?: string }): Promise<{ data: FlaggedPrompt[]; next_cursor: string | null }> {
  const qs = params?.cursor ? `?cursor=${params.cursor}` : ''
  return apiFetch(`/admin/queue${qs}`)
}

export function getAdminLog(): Promise<{ data: LogEntry[] }> {
  return apiFetch('/admin/log')
}

export function approvePrompt(id: string, reason?: string): Promise<Record<string, unknown>> {
  return apiFetch(`/admin/prompts/${id}/approve`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export function hidePrompt(id: string, reason?: string): Promise<Record<string, unknown>> {
  return apiFetch(`/admin/prompts/${id}/hide`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export function createLabel(input: { prefix: string; value: string; color?: string; description?: string }): Promise<AdminLabel> {
  return apiFetch('/labels', { method: 'POST', body: JSON.stringify(input) })
}

export function updateLabel(id: string, input: Partial<{ prefix: string; value: string; color: string; description: string }>): Promise<AdminLabel> {
  return apiFetch(`/labels/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteLabel(id: string): Promise<Record<string, never>> {
  return apiFetch(`/labels/${id}`, { method: 'DELETE' })
}
```

### Pattern 6: Composable Rewire Shape

Each admin composable currently imports from `@/lib/github/*`. Phase 14 replaces those imports with `@/lib/api/admin`. The TanStack Query wrapping structure stays identical — only the `queryFn` / `mutationFn` body changes.

**useAdminQueue rewire:**
- Before: `createGraphqlClient(...)(GET_FLAGGED_ISSUES, { ... })`
- After: `getAdminQueue({ cursor: pageParam })`
- Shape changes: `id` is now a ULID string (not a GitHub base64 node ID); `number` field goes away; keep `id`, `title`, `status`, `author`, `created_at`

**useAdminActions rewire:**
- Before: `removeLabelFromIssue(token, issueNumber, ...)` + `postModerationComment(token, ...)`
- After: `approvePrompt(id)` or `hidePrompt(id)` (single call replaces two)
- `deleteMutation` and `featureMutation` have no direct API-22–26 equivalents. `DELETE /prompts/:id` from Phase 12 covers prompt deletion. "Feature" has no v2 concept — see Pitfall 3 below.
- `bulkApproveMutation` / `bulkHideMutation` / `bulkDeleteMutation` — iterate calling the singular functions sequentially (same loop pattern already in the composable)

**useAdminLog rewire:**
- Before: complex GitHub issue comments scraping with regex matching
- After: `getAdminLog()` returns clean structured records from `moderation_log`
- `dateFrom`/`dateTo` filtering logic stays in the composable (client-side filter over API results, same as today)
- `LogEntry` interface simplifies — drop `issueNumber`, add `id` (ULID), `prompt.id` for linking

**useAdminLabels rewire:**
- Before: `getRepoLabels(token)` + `createRepoLabel/updateRepoLabel/deleteRepoLabel(token, ...)`
- After: `GET /labels` (existing public endpoint — no auth needed for read) + `createLabel/updateLabel/deleteLabel` from `admin.ts`
- ETag clearing (`clearEtag`) is removed entirely — replaced by TanStack Query `invalidateQueries`
- `groupedLabels` computed logic stays identical (group by prefix)
- Label validation regex (`/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*/`) stays in the composable

### Anti-Patterns to Avoid

- **Cascading deletes in moderation_log:** Do NOT add `onDelete: cascade` to moderation_log FKs. The schema intentionally preserves log entries when prompt/user is deleted (Phase 9 decision).
- **Combining requireMaintainer without requireAuth:** Always chain `requireAuth(), requireMaintainer()` in that order. requireMaintainer alone will return 403 for unauthenticated requests (should be 401).
- **Forgetting to mount sub-routes on the admin router:** Routes added to the inner `app` Hono instance must be discoverable from the `/admin` prefix that `index.ts` mounts.
- **Writing tests without seeded flagged prompts:** The seed data has no prompts with `status='flagged'`. Tests for `GET /admin/queue` and approve/hide must insert a flagged prompt in `beforeAll`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT auth check | Custom token parsing | `requireAuth()` from `middleware/auth.ts` | Already verified, handles expired token discrimination |
| Role guard | Custom role check in handler | `requireMaintainer()` from `middleware/role.ts` | Already tested in role.spec.ts |
| ID generation | Custom ID generation | `ulid()` from `ulid` package | Established pattern across all write handlers |
| Timestamp SQL | Raw string | `sql\`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))\`` (the `tsNow` pattern) | DRY + identical ISO 8601ms SQLite semantics (Phase 9 decision) |
| HTTP error parsing | Custom response handling | `apiFetch` from `@/lib/api/http.ts` | Already handles non-2xx, parses `{ error, code }` body |
| Query invalidation after mutations | Manual cache manipulation | `queryClient.invalidateQueries({ queryKey: [...] })` | Established `invalidateAdmin()` helper pattern in useAdminActions |

---

## Common Pitfalls

### Pitfall 1: Seeded Data Does Not Include Flagged Prompts

**What goes wrong:** `GET /admin/queue` returns empty array in tests because no seed data has `status='flagged'`.
**Why it happens:** `seed.sql` seeds only `published` prompts for the Browse screen; flagged prompts are an admin concept.
**How to avoid:** In `admin.spec.ts` `beforeAll`, insert a flagged prompt row directly into D1 via `env.DB.prepare(...).run()` before running queue tests. Pattern established in `write.spec.ts` for non-seeded test data.
**Warning signs:** Test asserts `items.length > 0` but gets 0.

### Pitfall 2: Admin Sub-Router Route Conflicts

**What goes wrong:** `POST /admin/prompts/:id/approve` and `/hide` need `/:id/approve` and `/:id/hide` as separate routes under the admin router, but registering them as `app.post('/prompts/:id/approve', ...)` inside the admin Hono sub-app is correct — the `/admin` prefix is handled by index.ts mounting.
**Why it happens:** Confusion between the sub-router's internal paths and the full URL.
**How to avoid:** Always write paths relative to the sub-app mount point (e.g., `/queue`, `/log`, `/prompts/:id/approve`).
**Warning signs:** Route returns 404 instead of 501 in the boot spec.

### Pitfall 3: "Feature" Action Has No v2 Endpoint

**What goes wrong:** `useAdminActions.featureMutation` calls `addLabelToIssue(status:featured)` which is a GitHub-Issues-only concept. There is no `POST /admin/prompts/:id/feature` in the Phase 14 requirements.
**Why it happens:** v1 used GitHub labels for status; v2 uses D1 `status` column. The `status` enum is `['published', 'flagged', 'hidden', 'draft']` — there is no `featured` variant.
**How to avoid:** When rewiring `useAdminActions`, remove `featureMutation` entirely (or stub it as a no-op like `flagPrompt`). The AdminQueueTab.vue uses it — check if the feature button needs to be hidden or kept as a client-only UI concept. **This is a design decision the planner should address.**
**Warning signs:** TypeScript errors when composable no longer exports `featureMutation`.

### Pitfall 4: useAdminQueue Item Shape Change (number → id)

**What goes wrong:** `AdminQueueTab.vue` uses `item.number` (GitHub issue number) in `selectedIds: Set<number>` and `selectedItems computed`. The v2 API returns ULID strings, not integers.
**Why it happens:** The composable's `FlaggedIssue` interface has `number: number` for issue numbers.
**How to avoid:** Update `FlaggedIssue` interface in `useAdminQueue.ts` to remove `number`, keep `id: string`. Update `AdminQueueTab.vue` to use string IDs in `selectedIds: Set<string>` and all bulk mutation calls.
**Warning signs:** TypeScript errors in AdminQueueTab.vue after updating the composable interface.

### Pitfall 5: API-27 Error Shape Audit May Find Inconsistencies

**What goes wrong:** Some early route handlers may not follow `{ error: string, code: string }` strictly. For example, `requireMaintainer` returns `{ error: 'forbidden' }` without a `code` field.
**Why it happens:** Different handlers were written in different phases with slightly different error shapes.
**How to avoid:** Before claiming API-27 complete, grep all route files for `c.json(` and verify every error response has both `error` and `code` fields. Fix any that only have `error`. The middleware errors (`requireAuth` and `requireMaintainer`) also need to be checked.
**Warning signs:** `role.spec.ts` only asserts `body.error` not `body.code` — the middleware may be missing `code`.

### Pitfall 6: Labels Write Handlers in labels.ts vs admin.ts

**What goes wrong:** Decision about where to put label write handlers. The existing `GET /labels` is in `labels.ts` and mounted at `/labels` (public, no auth). Label writes (`POST /labels`, `PATCH /labels/:id`, `DELETE /labels/:id`) are maintainer-only.
**Why it happens:** Two valid placements: (a) add write handlers to `labels.ts` with inline requireMaintainer guards, or (b) add them to `admin.ts` mounted at `/admin/labels/*`.
**How to avoid:** The requirements spec says `POST /labels`, `PATCH /labels/:id`, `DELETE /labels/:id` — NOT `/admin/labels/*`. Implement in `labels.ts` alongside GET, with `requireAuth() + requireMaintainer()` guards on each write handler only. This avoids creating a third URL prefix and keeps all label logic co-located.
**Warning signs:** If implemented under `/admin`, the frontend admin.ts wrapper will call `/admin/labels` which won't match the requirements spec URL.

### Pitfall 7: Composable Spec Files Still Import @/lib/github/*

**What goes wrong:** After rewiring composables, their spec files still `vi.mock('@/lib/github/...')`. The composable no longer imports that module, so the mock is meaningless and specs test nothing.
**Why it happens:** The existing composable specs mock the old GitHub module. Rewiring the composable changes the import path.
**How to avoid:** For each rewired composable, update its spec to `vi.mock('@/lib/api/admin', ...)` with the new function signatures. This is the same work done for all other composables in Phase 13.
**Warning signs:** Spec passes but the mock is never called (the composable isn't actually using the mock).

---

## Code Examples

### Test Setup Pattern for Admin Endpoints (from established write.spec.ts pattern)

```typescript
// src/workers/api/routes/admin.spec.ts — established pattern from write.spec.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { sign } from 'hono/jwt'
import app from '../index'

const SEEDED_MAINTAINER_ID = '01DEVMAINT00000000000000001'
const SEEDED_USER_ID = '01DEVUSER000000000000000001'
let maintainerToken: string
let userToken: string

// Note: seed.sql has NO flagged prompts — insert one here
let FLAGGED_PROMPT_ID: string

beforeAll(async () => {
  const jwtSecret = (env as Record<string, string>).JWT_SECRET ?? 'test-secret'
  maintainerToken = await sign({ sub: SEEDED_MAINTAINER_ID, role: 'maintainer', login: 'dev-maintainer', exp: Math.floor(Date.now() / 1000) + 86400 }, jwtSecret)
  userToken = await sign({ sub: SEEDED_USER_ID, role: 'user', login: 'dev-user', exp: Math.floor(Date.now() / 1000) + 86400 }, jwtSecret)

  // Insert a flagged prompt for queue tests (not in seed.sql)
  FLAGGED_PROMPT_ID = '01PFLAGGED0000000000000001'
  await env.DB.prepare(
    `INSERT OR IGNORE INTO prompts (id, author_id, title, body, status) VALUES (?, ?, ?, ?, 'flagged')`
  ).bind(FLAGGED_PROMPT_ID, SEEDED_USER_ID, 'Suspicious Prompt', 'Bad content').run()
})
```

### Error Shape Verification Pattern

```typescript
// Verify { error, code } shape — both fields required per API-27
const body = await res.json<Record<string, unknown>>()
expect(body).toHaveProperty('error')
expect(body).toHaveProperty('code')
```

### Frontend Composable Spec Rewire Pattern (from Phase 13 established approach)

```typescript
// useAdminQueue.spec.ts — rewrite mock target
vi.mock('@/lib/api/admin', () => ({
  getAdminQueue: vi.fn().mockResolvedValue({
    data: [{ id: '01PFLAGGED0000000000000001', title: 'Suspicious Prompt', status: 'flagged', author: { login: 'dev-user', avatar_url: null }, created_at: '2026-01-15T10:00:00Z' }],
    next_cursor: null,
  }),
}))
```

---

## State of the Art

| Old Approach (v1) | v2 Approach | Impact for Phase 14 |
|-------------------|-------------|---------------------|
| GitHub GraphQL `GET_FLAGGED_ISSUES` query | `GET /admin/queue` on D1 | Must replace the GraphQL client with apiFetch |
| GitHub issue comments scraped for moderation log | `GET /admin/log` from `moderation_log` table | Log is now structured; no regex parsing needed |
| GitHub REST `POST /labels` (repo labels) | `POST /labels` writing to D1 `labels` table | Totally different resource; simpler CRUD |
| GitHub labels for approve/hide | D1 `prompts.status` enum update | Single DB call instead of two GitHub REST calls |
| ETag cleared on label mutation | `queryClient.invalidateQueries` | ETag layer completely removed in Phase 13 |
| `authStore.token` passed to every mutation | Cookie-based auth, no token param | `apiFetch` sends `credentials: 'include'` automatically |

---

## Open Questions

1. **featureMutation — keep, stub, or remove?**
   - What we know: `useAdminActions.featureMutation` calls GitHub label API for `status:featured`; there is no v2 `featured` status in the D1 `prompts.status` enum
   - What's unclear: Does the `AdminQueueTab.vue` feature button need to remain functional, be hidden, or be removed entirely?
   - Recommendation: Stub it as a no-op (like `flagPrompt`) or remove it. The planner should decide whether `AdminQueueTab.vue` needs any component edits (FRONT-06 says "UI components remain untouched" as a general rule, but this may be a necessary change). Marking as Claude's discretion in the plan.

2. **useAdminStats after rewire**
   - What we know: `useAdminStats` queries GitHub GraphQL for total/flagged/featured counts; there is no dedicated `/admin/stats` endpoint in Phase 14 requirements
   - What's unclear: How should `useAdminStats` derive counts in v2? Option A: derive from queue length (not accurate for "total"); Option B: add a lightweight `/admin/stats` endpoint (counts from D1 with COUNT queries); Option C: leave it using GitHub data for now (won't work without GitHub token)
   - Recommendation: Add `GET /admin/stats` as a simple COUNT query alongside the other admin endpoints. This is minimal effort and unblocks the AdminView.vue stats bar. The planner should include this as a sub-task.

3. **GET /admin/log pagination**
   - What we know: `moderation_log` could grow large; the current `useAdminLog` fetches everything for client-side date filtering
   - What's unclear: Whether to implement cursor-based pagination or return all records (Phase 13 precedent: activity did use pagination)
   - Recommendation: Return all records initially (no pagination) matching the current composable behavior. The date filter stays client-side. Add a `limit` cap (e.g., 500) to prevent runaway queries.

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (two configs) |
| Worker specs config | `vitest.workers.config.ts` — `@cloudflare/vitest-pool-workers`, workerd runtime |
| Frontend specs config | `vitest.config.ts` — jsdom, excludes `src/workers/**` |
| Quick run (worker) | `npx vitest run --config vitest.workers.config.ts` |
| Quick run (frontend) | `npx vitest run` |
| Full suite | `npx vitest run && npx vitest run --config vitest.workers.config.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Test File | Automated Command |
|--------|----------|-----------|-----------|-------------------|
| API-22 | GET /admin/queue returns flagged prompts; 403 for non-maintainer | worker integration | `src/workers/api/routes/admin.spec.ts` | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` |
| API-23 | GET /admin/log returns moderation history; 403 for non-maintainer | worker integration | `src/workers/api/routes/admin.spec.ts` | same |
| API-24 | POST /admin/prompts/:id/approve updates status + logs; 403 for user | worker integration | `src/workers/api/routes/admin.spec.ts` | same |
| API-25 | POST /admin/prompts/:id/hide updates status + logs; 403 for user | worker integration | `src/workers/api/routes/admin.spec.ts` | same |
| API-26 | POST/PATCH/DELETE /labels succeeds for maintainer; 403 for user | worker integration | `src/workers/api/routes/admin.spec.ts` (or `labels.spec.ts`) | same |
| API-27 | All error responses have `{ error, code }` shape | grep audit + worker integration | existing specs + audit | `grep -r 'c.json(' src/workers/api/routes/ src/workers/api/middleware/` |
| API-28 | Admin routes reject missing/insufficient JWT with 401/403 | worker integration | `src/workers/api/routes/admin.spec.ts` | `npx vitest run --config vitest.workers.config.ts src/workers/api/routes/admin.spec.ts` |
| FRONT-06 | admin composables use @/lib/api/admin; specs mock new module | frontend unit | `useAdminQueue.spec.ts`, `useAdminActions.spec.ts`, `useAdminLog.spec.ts`, `useAdminLabels.spec.ts` | `npx vitest run src/composables/queries/useAdmin` |

### Sampling Rate
- **Per task commit:** Run the relevant spec file only (worker or frontend per task)
- **Per wave merge:** `npx vitest run && npx vitest run --config vitest.workers.config.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/workers/api/routes/admin.spec.ts` — covers API-22, API-23, API-24, API-25, API-26, API-28 (does not exist yet)
- The frontend composable spec files already exist but need to be rewritten; they are NOT Wave 0 gaps (files exist, specs just test the wrong module)

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — all findings verified by reading source files
- `src/workers/api/middleware/auth.ts` — requireAuth implementation confirmed
- `src/workers/api/middleware/role.ts` — requireMaintainer implementation confirmed
- `src/workers/api/db/schema.ts` — moderation_log and labels table schemas confirmed
- `src/workers/api/routes/prompts.ts` — established Drizzle + D1 patterns (batch inArray, JS aggregation, ulid, tsNow sql)
- `src/workers/api/routes/labels.ts` — existing GET /labels implementation
- `src/workers/api/routes/write.spec.ts` — established TDD test pattern including JWT minting, beforeAll setup
- `scripts/seed.sql` — confirms NO flagged prompts in seed data
- `src/composables/queries/useAdminQueue.ts`, `useAdminActions.ts`, `useAdminLog.ts`, `useAdminLabels.ts` — current v1 composables confirmed

### Secondary (MEDIUM confidence)

- `.planning/phases/13-frontend-rewire/13-CONTEXT.md` — confirmed `flagPrompt` is a no-op stub awaiting Phase 14; confirmed FRONT-06 deferred from Phase 13

---

## Metadata

**Confidence breakdown:**
- Backend route implementation: HIGH — all patterns established in Phases 11/12; middleware already tested
- Frontend composable rewire: HIGH — established pattern from Phase 13 (13 composables already rewired this way)
- API-27 error shape audit: MEDIUM — need to verify middleware error shapes include `code` field
- featureMutation / useAdminStats open questions: LOW — design decisions not yet resolved

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable stack)
