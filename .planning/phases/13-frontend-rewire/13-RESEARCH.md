# Phase 13: Frontend Rewire - Research

**Researched:** 2026-05-08
**Domain:** Vue 3 SPA composable migration — `src/lib/github/*` to `src/lib/api/*`; ETag removal; Activity tab; MiniSearch/PWA wiring
**Confidence:** HIGH (entire codebase read directly; no external research needed for this migration phase)

## Summary

Phase 13 is a pure plumbing migration. Every composable that calls `src/lib/github/*` is repointed to `src/lib/api/*`. No UI components change. The work is well-bounded: there are exactly 20 composable files with `@/lib/github` imports, each identified by filename. The new API layer (`src/lib/api/`) consists of three files: `http.ts` (the fetch wrapper), `queries.ts` (all GET functions), and `mutations.ts` (all POST/PATCH/DELETE functions). This mirrors the structure of the old GitHub lib exactly.

One notable complication: the `Prompt` type in `src/types/index.ts` still carries `id: number` (GitHub issue number) and `nodeId: string` (GraphQL base64 ID). The API layer uses ULID strings for `id` and has no `nodeId` concept. These fields are embedded throughout composables, the TanStack Query cache key `['prompt', id]` (which uses `number`), and the `QueuedAction.issueNumber: number` field. The type migration (`id: string`, drop `nodeId`) is part of this phase's scope.

The service worker currently caches `api.github.com` via Workbox `runtimeCaching`. This must be updated to cache the `VITE_API_URL` origin. The `useSearchStore.buildIndex()` is already called in `BrowseView.vue` via a `watch(allPrompts, ...)` — no structural change needed there, only the data shape must align.

**Primary recommendation:** Build `src/lib/api/http.ts` first (apiFetch wrapper), then `queries.ts` + `mutations.ts` by converting each GitHub function 1:1, then migrate composables in import-only waves starting with the lowest-dependency ones.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary**
Replace every `src/lib/github/*` import in composables with `src/lib/api/*`. Delete the ETag layer (`src/lib/github/etag.ts`). Wire the Activity tab to live data from `/users/:login/activity`. Rebuild MiniSearch index from API responses. No changes to any UI component.

**Already done (Phase 10):** Auth store reads identity from `/me`; `isMaintainer` derived from `role` field. Success criterion 2 is already met.

**Out of scope:**
- Any new API endpoints or backend changes
- Deleting v1 github lib files (Phase 15)
- Admin panel rewire (Phase 14)

**Activity Tab**
- Show `prompt_created` events only — no comments/reactions (API already returns this, no backend changes needed)
- Display as simple list: "Published [title] — [relative date]" — matches existing Submitted tab style, no new components
- Visible on own profile only — keep existing `isOwnProfile` gate, no change to ProfileTabs.vue logic
- Infinite scroll pagination — auto-load more as user scrolls, consistent with main prompt feed; use `useInfiniteQuery` with cursor-based pagination (`?cursor=&limit=20`)

**Offline Queue**
- Update to cookie-based API — swap GitHub token calls to `src/lib/api/*` equivalents; cookie is automatically sent with `credentials: 'include'`, no token parameter needed
- Clear stale v1 queue on first drain — on mount/online, detect integer IDs in the queue and flush them before draining (one-time migration guard)
- Rename `QueuedAction.issueNumber: number` → `QueuedAction.promptId: string` to align with ULID-based IDs

**Spec Files**
- Rewrite all ~15 composable specs with new mocks — swap mocked module path from `src/lib/github/*` to `src/lib/api/*`
- Keep `vi.mock()` per function — consistent with existing spec style, no MSW setup required

**API Client Shape (`src/lib/api/*`)**
- Structure: `queries.ts` + `mutations.ts` — mirrors existing `src/lib/github/queries.ts` and `mutations.ts`; composables do a 1:1 import-path swap
- Shared fetch helper: `src/lib/api/http.ts` — `apiFetch(path, options)` wrapper handles base URL (`VITE_API_URL`) and `credentials: 'include'`; both queries.ts and mutations.ts import it
- Error handling: throw on non-2xx, parse JSON error body — throws `Error` with message from `{ error: string, code: string }` response shape; TanStack Query catches it via `isError`

### Claude's Discretion
- Exact `apiFetch` TypeScript signature and generic type parameters
- How the MiniSearch `buildIndex` call is triggered after the prompt list query resolves
- Service worker cache rule configuration for API responses
- Exact relative date formatting (e.g., date-fns, Intl.RelativeTimeFormat, or existing utility)

### Deferred Ideas (OUT OF SCOPE)
- Richer activity feed (comments made, reactions received) — would require new activity_log table; future phase
- MSW for integration-level HTTP mocking — could be added as a test improvement in Phase 15
- Logout endpoint (`POST /auth/logout`) is now IN SCOPE per CONTEXT.md deferred section note: "should be included in scope (wire the `logout()` store method to call the endpoint)"
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FRONT-01 | `src/lib/api/client.ts` (or `http.ts`) — fetch wrapper with credentials + error handling | `apiFetch(path, opts)` pattern; `VITE_API_URL` base; `credentials: 'include'`; throw on non-2xx |
| FRONT-02 | `src/lib/api/prompts.ts` — replaces github queries.ts + mutations.ts for prompts | API endpoints: GET /prompts, /prompts/:id, /prompts/:id/versions, /prompts/:id/comments, POST /prompts, PATCH /prompts/:id, DELETE /prompts/:id, POST /prompts/:id/versions, POST /prompts/:id/versions/:n/restore |
| FRONT-03 | `src/lib/api/comments.ts` — replaces GitHub comment paths | API endpoint: POST /prompts/:id/comments, DELETE /comments/:id |
| FRONT-04 | `src/lib/api/reactions.ts` — replaces GitHub reaction paths | API endpoints: POST /prompts/:id/reactions, DELETE /prompts/:id/reactions |
| FRONT-05 | `src/lib/api/users.ts` — replaces GitHub user lookup paths | API endpoints: GET /users/:login, GET /users/:login/prompts, GET /users/:login/activity |
| FRONT-06 | `src/lib/api/admin.ts` — replaces GitHub admin/maintainer paths | Deferred to Phase 14; admin composables (useAdminActions, useAdminLog, useAdminLabels, useAdminStats, useAdminQueue) are OUT OF SCOPE for Phase 13 |
| FRONT-07 | Composables/queries re-import from `@/lib/api/*` | 9 query composables identified; TanStack Query cache keys preserved |
| FRONT-08 | Composables/mutations re-import from `@/lib/api/*` | 7 mutation composables identified; token params removed (cookie-based) |
| FRONT-09 | `useAuthStore` updated for JWT/cookie — already done in Phase 10 | Verify complete; add `logout()` → `POST /auth/logout` wiring |
| FRONT-10 | `src/lib/github/etag.ts` deleted; TanStack Query `staleTime` + HTTP cache headers replace it | `clearEtag` import in `useAdminLabels.ts` must be removed |
| FRONT-11 | Activity tab placeholder replaced by `/users/:login/activity` data | New `useUserActivity` composable; `useInfiniteQuery`; `ProfileTabs.vue` wired |
| SEARCH-03 | MiniSearch client-side index retained for offline PWA (built from API responses) | Already works via `watch(allPrompts, buildIndex)` in BrowseView.vue — data shape alignment needed |
| SEARCH-04 | Service worker continues caching prompt list responses for offline read | Workbox `runtimeCaching` in `vite.config.ts` must swap github API URL pattern for `VITE_API_URL` origin |
</phase_requirements>

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/vue-query | ^5.92.9 | Server state management | Already used for all composables |
| pinia | ^3.0.4 | Client state store | useAuthStore, useSearchStore etc. |
| minisearch | ^7.2.0 | Client-side full-text search | Offline PWA requirement |
| vite-plugin-pwa | ^1.2.0 | Service worker + Workbox | Already configured |
| date-fns | ^4.1.0 | Relative date formatting | `formatDistanceToNow` already used in UI components |
| @vueuse/core | ^14.2.1 | `useOnline` composable | Already used in useOfflineQueue |

### No New Dependencies Required
This phase adds no new packages. All required tools exist. The `date-fns` `formatDistanceToNow` function is the correct choice for Activity tab relative timestamps — it is already imported in `CommentSection.vue`, `PromptMetadata.vue`, and `PromptRow.vue`.

## Architecture Patterns

### Recommended `src/lib/api/` Structure
```
src/lib/api/
├── http.ts          # apiFetch wrapper — base URL + credentials + error handling
├── queries.ts       # All GET functions (prompts, users, search, labels, notifications)
└── mutations.ts     # All POST/PATCH/DELETE functions
```

FRONT-06 (`admin.ts`) is Phase 14 scope. Do not create it in Phase 13.

### Pattern 1: apiFetch Wrapper
**What:** Minimal fetch helper with base URL injection, credentials, and non-2xx error throwing.
**When to use:** Every API call in queries.ts and mutations.ts.
**Example:**
```typescript
// src/lib/api/http.ts
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = import.meta.env.VITE_API_URL as string
  const res = await fetch(`${base}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'unknown', code: 'unknown' })) as { error: string; code: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  // 204 No Content — return empty object
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}
```
**Notes:**
- `Content-Type: application/json` default is correct for all write operations; GET requests will not have a body, the header is harmless.
- `credentials: 'include'` is essential for HttpOnly cookie (`pc_session`) to be sent with cross-origin API calls.
- 204 guard is needed for DELETE endpoints that return no body.

### Pattern 2: 1:1 Composable Import Swap
**What:** Each composable changes only its import path, not its logic.
**When to use:** All query composables (usePromptsQuery, usePromptDetail, usePromptVersions, useUserProfile, useComments).
**Example:**
```typescript
// BEFORE:
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_PROMPTS } from '@/lib/github/queries'

// AFTER:
import { getPrompts } from '@/lib/api/queries'
```

**Key:** The query function body changes from GraphQL client call → `apiFetch()` call + response mapping.

### Pattern 3: useInfiniteQuery for Activity Tab (existing pattern from usePromptsQuery)
**What:** Cursor-based infinite pagination for the Activity tab.
**When to use:** New `useUserActivity` composable.
**Example:**
```typescript
// mirrors usePromptsQuery pattern exactly
export function useUserActivity(login: Ref<string>) {
  return useInfiniteQuery({
    queryKey: computed(() => ['user-activity', login.value]),
    queryFn: ({ pageParam }) =>
      getUserActivity(login.value, { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: computed(() => Boolean(login.value)),
    staleTime: 60_000,
  })
}
```

### Pattern 4: Spec Mock Swap (established pattern in all existing specs)
**What:** Each spec file `vi.mock()`s the new API module path instead of the GitHub path.
**When to use:** All ~13 spec files that currently mock `@/lib/github/*`.
**Example:**
```typescript
// BEFORE:
vi.mock('@/lib/github/mutations', () => ({
  postComment: vi.fn(),
  addReaction: vi.fn(),
}))
import * as mutations from '@/lib/github/mutations'

// AFTER:
vi.mock('@/lib/api/mutations', () => ({
  postComment: vi.fn(),
  addReaction: vi.fn(),
}))
import * as mutations from '@/lib/api/mutations'
```

### Pattern 5: Workbox Service Worker Cache Update
**What:** Replace the `api.github.com` Workbox runtimeCaching rule with one for `VITE_API_URL`.
**Problem:** Workbox config in `vite.config.ts` is static — it cannot read `VITE_API_URL` at config-write time for the regex.
**Solution:** Use a pattern that matches the known local (`localhost:8787`) and production API origins, OR use the `NetworkFirst` handler with an origin-based urlPattern. Since `VITE_API_URL` is known at build time, use `process.env.VITE_API_URL` in vite.config.ts.

```typescript
// vite.config.ts workbox runtimeCaching replacement
{
  urlPattern: ({ url }) => url.pathname.startsWith('/prompts'),
  handler: 'NetworkFirst',
  options: {
    cacheName: 'api-prompts-cache',
    networkTimeoutSeconds: 5,
    expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
    cacheableResponse: { statuses: [0, 200] },
  },
}
```
**Alternative (simpler):** Keep origin-based regex and accept that dev uses localhost. The service worker only runs in production context meaningfully.

### TanStack Query Cache Keys — PRESERVE EXACTLY
**Critical:** Cache keys must not change. Existing keys:
- `['prompts', filters]` — usePromptsQuery (infinite)
- `['prompt', id]` — usePromptDetail (single prompt, `id` will become string ULID)
- `['prompt-versions', issueNumber]` — usePromptVersions
- `['user-profile', login]` — useUserProfile
- `['admin', 'stats']`, `['admin', 'queue']`, `['admin', 'log']` — admin composables (Phase 14)
- `['labels']` — useAdminLabels (Phase 14)
- `['notifications']` — notifications (Phase 14)
- NEW: `['user-activity', login]` — useUserActivity

### Type Migration: `Prompt.id` from `number` to `string`
**Current type** (`src/types/index.ts`):
```typescript
export interface Prompt {
  id: number           // GitHub issue number
  nodeId: string       // GitHub GraphQL node ID
  // ...
}
```
**New type:**
```typescript
export interface Prompt {
  id: string           // ULID from API
  // nodeId: removed — API has no GraphQL node ID
  // ...
}
```
**Ripple effects** (all must be updated in Phase 13):
- `ProfileTabs.vue` — `bookmarkedIds.map(id => ...)` — `id` is used as cache key, type changes
- `useBookmarksStore.ts` — `bookmarkedIds: number[]` → `string[]`
- `useReactions.ts` — `issueId: Ref<number>` → `Ref<string>` (the queryKey `['prompt', issueId]` stays)
- `useComments.ts` — `issueId: Ref<number>` → `Ref<string>`
- `useFlagPrompt.ts` — `issueId: Ref<number>` → `Ref<string>`
- `usePromptVersions.ts` — `issueNumber: Ref<number>` → `Ref<string>`
- `useRestoreVersion.ts` — `issueNumber: number` → `string`
- `QueuedAction.issueNumber: number` → `QueuedAction.promptId: string` (CONTEXT.md decision)
- `ProfileTabs.vue` references `submission.number` (from GitHub) → `submission.id` (ULID)
- `usePromptsQuery.ts` — `mapIssueToPrompt` result: `id: issue.number` → `id: issue.id`
- Router navigation: `router.push({ name: 'prompt-detail', params: { id: submission.number } })` → `submission.id`

### Anti-Patterns to Avoid
- **Building a full HTTP interceptor**: `apiFetch` is intentionally minimal — no request/response interceptors, no retry logic, no auth header injection. TanStack Query + cookie handles all that.
- **Storing GitHub token in new API calls**: The `authStore.token` field no longer exists. All mutation composables must drop the `token` parameter from API function calls.
- **Changing UI component templates**: Zero template changes allowed in this phase. Only `<script setup>` composable wiring in `ProfileTabs.vue` (Activity tab) and `ProfileStats.vue` (if needed).
- **Adding MSW**: Spec pattern stays as `vi.mock()` per the CONTEXT.md decision.
- **Leaving etag imports**: `useAdminLabels.ts` has `import { clearEtag } from '@/lib/github/etag'` — this must be removed when migrating that composable. However, `useAdminLabels.ts` is an admin composable (Phase 14 scope). The `etag.ts` file deletion is Phase 13 scope (FRONT-10), but admin composable rewire is Phase 14.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative timestamps | Custom date formatter | `formatDistanceToNow` from `date-fns` | Already imported in 3 components; consistent with existing UI |
| Offline detection | Custom navigator.onLine polling | `useOnline` from `@vueuse/core` | Already used in useOfflineQueue |
| Infinite scroll | Manual scroll event listeners | `useInfiniteQuery` from TanStack Query | Same pattern already in usePromptsQuery |
| HTTP base URL injection | Hardcoded URL concatenation everywhere | `apiFetch` wrapper that reads `VITE_API_URL` | Single source of truth, testable |
| Service worker cache bust | Manual cache.delete() calls | Workbox `runtimeCaching` rules | Already managed by vite-plugin-pwa Workbox |
| Optimistic updates | Custom state management | TanStack Query `onMutate` / `onError` rollback pattern | Already proven in useReactions |
| JSON body serialization | Manual `JSON.stringify` per call | Centralize in `apiFetch` default headers | Error-prone to repeat |

## Complete Composable Audit

### Composables that need `@/lib/github` imports removed (Phase 13 scope):
| File | Current Import | Action |
|------|---------------|--------|
| `usePromptsQuery.ts` | `octokit`, `queries` | Rewrite to `getPrompts` from `@/lib/api/queries` |
| `usePromptDetail.ts` | `octokit`, `queries` | Rewrite to `getPromptDetail` from `@/lib/api/queries` |
| `usePromptVersions.ts` | `octokit` (inline query) | Rewrite to `getPromptVersions` from `@/lib/api/queries` |
| `useUserProfile.ts` | `octokit`, `queries` | Rewrite to `getUserPrompts` from `@/lib/api/queries` |
| `useComments.ts` | `mutations` | Rewrite to `postComment` from `@/lib/api/mutations` |
| `useReactions.ts` | `mutations` | Rewrite to `addReaction`, `removeReaction` from `@/lib/api/mutations` |
| `useOfflineQueue.ts` | `mutations` | Rewrite to use `@/lib/api/mutations` equivalents |
| `useCreatePrompt.ts` | `mutations` | Rewrite to `createPrompt` from `@/lib/api/mutations` |
| `useUpdatePrompt.ts` | `mutations` | Rewrite to `updatePrompt`, `createVersion` from `@/lib/api/mutations` |
| `useFlagPrompt.ts` | `mutations` | Rewrite to `flagPrompt` from `@/lib/api/mutations` |
| `useRestoreVersion.ts` | `mutations` | Rewrite to `restoreVersion` from `@/lib/api/mutations` |

### Composables that are Phase 14 scope (admin panel — do NOT touch in Phase 13):
- `useAdminActions.ts`
- `useAdminStats.ts`
- `useAdminQueue.ts`
- `useAdminLog.ts`
- `useAdminLabels.ts`

### New composable to create:
- `useUserActivity.ts` — `useInfiniteQuery` for `/users/:login/activity`

## Common Pitfalls

### Pitfall 1: `Prompt.id` is `number` everywhere — query cache keys break on type mismatch
**What goes wrong:** TanStack Query cache key `['prompt', 42]` is set in one place and read as `['prompt', '01PROMPT...']` in another. Cache misses cause infinite loading.
**Why it happens:** `Prompt.id` changes from `number` to `string` ULID; any component/composable that uses the old numeric ID for cache lookup will miss.
**How to avoid:** Update `src/types/index.ts` first. Let TypeScript compiler errors guide every usage site. Do not manually search — let `tsc --noEmit` enumerate all errors.
**Warning signs:** Components show "loading" indefinitely after migration; `queryClient.getQueryData(['prompt', numericId])` returns undefined.

### Pitfall 2: `authStore.token` does not exist in `useAuthStore` — it was removed in Phase 10
**What goes wrong:** Composable calls `authStore.token!` — but `useAuthStore` no longer exposes `token`. TypeScript will catch this at compile time. Runtime: `undefined!` → mutations called with `undefined` as first arg.
**Why it happens:** Phase 10 already migrated auth to cookie-based. The old composables have a comment "Phase 15 will migrate to cookie-based API" — that migration is Phase 13, not 15.
**How to avoid:** In the new `@/lib/api/mutations.ts`, all functions take NO token parameter. `credentials: 'include'` in `apiFetch` handles auth automatically.
**Warning signs:** Existing spec comments say "token is undefined in Phase 10 (authStore.token removed)" — these specs already pass with `undefined` because vi.mock intercepts before the real call.

### Pitfall 3: Offline queue stale integer IDs — migration guard required
**What goes wrong:** A user who last used the app in v1 has integer-ID queued actions in `localStorage`. After Phase 13 deploys, drainQueue tries to call `postComment(promptId)` with a ULID but the stored action has `issueNumber: 42`.
**Why it happens:** `QueuedAction.issueNumber: number` → `QueuedAction.promptId: string` is a breaking change to the stored shape.
**How to avoid:** In `drainQueue()`, detect legacy integer-ID entries and flush them to void before draining. One-time guard: `if (typeof action.issueNumber === 'number') { skip/flush }`.
**Warning signs:** Drain attempts, API returns 404 (ULID expected, integer received), toast spam.

### Pitfall 4: Workbox config runs at build time — `VITE_API_URL` is not a runtime variable
**What goes wrong:** `process.env.VITE_API_URL` in `vite.config.ts` is read during the Vite build. If the regex pattern tries to use the env var to build a URL pattern, it may be undefined in the build environment.
**Why it happens:** Workbox `urlPattern` in `vite.config.ts` is evaluated at build time by Workbox, not at SW runtime.
**How to avoid:** Use a path-based `urlPattern` function `({ url }) => url.pathname.startsWith('/prompts')` (origin-agnostic), or hardcode the production API origin. The cleanest approach: match on `/prompts`, `/users`, `/search`, `/labels`, `/notifications`, `/me` path prefixes.
**Warning signs:** Service worker caches wrong responses; offline browsing fails.

### Pitfall 5: `ProfileTabs.vue` uses `submission.number` (GitHub issue number) for navigation
**What goes wrong:** The Submitted tab row click does `router.push({ name: 'prompt-detail', params: { id: submission.number } })`. After migration, `submission.number` does not exist — it becomes `submission.id` (ULID string).
**Why it happens:** `useUserProfile` returns objects with GitHub issue `number` field. New API returns ULID `id` field.
**How to avoid:** Update both `useUserProfile.ts` (return shape) and `ProfileTabs.vue` (`submission.number` → `submission.id`) together. No template changes — only the `@click` handler in `<script setup>`.
**Warning signs:** Navigation to prompt detail fails; URL becomes `/prompts/undefined`.

### Pitfall 6: `etag.ts` imports in `useAdminLabels.ts` — can't delete file yet
**What goes wrong:** `src/lib/github/etag.ts` is flagged for deletion (FRONT-10), but `useAdminLabels.ts` still imports `clearEtag` from it. Admin composables are Phase 14 scope.
**Why it happens:** `etag.ts` has one remaining consumer after all Phase 13 composables are migrated.
**How to avoid:** Do NOT delete `etag.ts` in Phase 13. The file deletion happens when all consumers are gone (Phase 15 has DECOM-04 for full deletion). Phase 13 only ensures query/mutation composables no longer import from it. The spec file `etag.spec.ts` stays.
**Warning signs:** TypeScript error "Cannot find module '@/lib/github/etag'" in `useAdminLabels.ts` if deleted prematurely.

### Pitfall 7: `useAdminLabels.spec.ts` imports `@/lib/github/etag` — spec will fail if etag.ts is deleted
**What goes wrong:** `useAdminLabels.spec.ts` imports and mocks `@/lib/github/etag`. If etag.ts is deleted, this spec breaks.
**Resolution:** Leave etag.ts intact. Phase 13 deletes ONLY etag.ts's role in the active query/mutation composables, not the file itself.

## Code Examples

### apiFetch — canonical implementation
```typescript
// src/lib/api/http.ts
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json() as { error?: string }
      if (body.error) message = body.error
    } catch { /* ignore parse errors */ }
    throw new Error(message)
  }
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}
```

### Pagination response shape from API (Phase 11 decision)
```typescript
// All paginated endpoints return:
interface PageResponse<T> {
  data: T[]
  next_cursor: string | null
}
```

### Activity feed response shape from GET /users/:login/activity
```typescript
// From src/workers/api/routes/users.ts (Phase 11)
interface ActivityItem {
  type: 'prompt_created'
  prompt: {
    id: string        // ULID
    title: string
    created_at: string  // ISO 8601
  }
}
interface ActivityResponse {
  data: ActivityItem[]
  next_cursor: string | null
}
```

### useUserActivity composable
```typescript
import { useInfiniteQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getUserActivity } from '@/lib/api/queries'

export function useUserActivity(login: Ref<string>) {
  return useInfiniteQuery({
    queryKey: computed(() => ['user-activity', login.value]),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getUserActivity(login.value, pageParam),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: computed(() => Boolean(login.value)),
    staleTime: 60_000,
  })
}
```

### Activity tab display (ProfileTabs.vue addition — script setup only)
```typescript
// Add to ProfileTabs.vue <script setup> — NO template changes except wiring existing slot
import { useUserActivity } from '@/composables/queries/useUserActivity'
import { formatDistanceToNow } from 'date-fns'

const loginRef = toRef(props, 'login')
const { data: activityData, hasNextPage, isFetchingNextPage, fetchNextPage } = useUserActivity(loginRef)

const activityItems = computed(() =>
  activityData.value?.pages.flatMap((p) => p.data) ?? []
)

function relativeDate(isoDate: string): string {
  return formatDistanceToNow(new Date(isoDate), { addSuffix: true })
}
```

### Offline queue migration guard
```typescript
// In drainQueue(), before processing:
const legacyItems = queue.filter((a) => 'issueNumber' in a)
if (legacyItems.length > 0) {
  // Flush stale v1 items — integer IDs are incompatible with ULID API
  const validQueue = queue.filter((a) => !('issueNumber' in a))
  localStorage.setItem(QUEUE_KEY, JSON.stringify(validQueue))
  queue = validQueue
}
```

### Logout wiring (deferred → now in scope)
```typescript
// src/stores/useAuthStore.ts — update logout()
async function logout() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL as string
    await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch { /* ignore network errors */ }
  user.value = null
}
```
Note: `POST /auth/logout` endpoint needs to be added to the auth worker. This is a backend change. CONTEXT.md says "should be included in scope" but the Phase 13 boundary says "no new API endpoints or backend changes." The logout endpoint is a backend add. The planner should treat this as a scoped addition: add the `DELETE /auth/logout` (or `POST`) cookie-clearing endpoint to `src/workers/api/routes/auth.ts` (small addition) alongside wiring `logout()` in `useAuthStore`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub GraphQL client (`@octokit/graphql`) | `apiFetch` REST wrapper | Phase 13 | Removes Octokit dependency entirely from composable layer |
| ETag cache in localStorage | TanStack Query `staleTime` + HTTP `Cache-Control` | Phase 13 | Simpler; browser handles freshness |
| `Prompt.id: number` (GitHub issue number) | `Prompt.id: string` (ULID) | Phase 13 | Aligns with D1 schema identity |
| `QueuedAction.issueNumber: number` | `QueuedAction.promptId: string` | Phase 13 | Aligns with ULID-based API |
| Workbox caches `api.github.com` | Workbox caches self-hosted API origin | Phase 13 | Correct offline caching for v2 |

## Open Questions

1. **Logout endpoint — backend vs frontend boundary**
   - What we know: CONTEXT.md says "Logout endpoint... should be included in scope (wire the `logout()` store method to call the endpoint)." Phase boundary says "no new API endpoints."
   - What's unclear: Does wiring `logout()` require adding `POST /auth/logout` to the Hono worker?
   - Recommendation: Include `POST /auth/logout` as a small addition to `src/workers/api/routes/auth.ts` (clears the `pc_session` cookie via `deleteCookie`). It is a 5-line change and directly unblocks the frontend wiring. The planner should create a specific task for this.

2. **`etag.ts` deletion timing**
   - What we know: FRONT-10 says delete `etag.ts`. But `useAdminLabels.ts` still imports `clearEtag` and is Phase 14 scope.
   - Recommendation: Do NOT delete `etag.ts` in Phase 13. Remove all imports of `etag.ts` from Phase 13 composables. Deletion happens in Phase 15 (DECOM-04) when the last consumer (useAdminLabels) is also migrated.

3. **`Prompt.comments` field** — the new API does not return `comments` inline on the listing endpoint; it only returns `comment_count`. The `Prompt` type currently has `comments: CommentNode[]`. The prompt detail endpoint may return comments separately.
   - What we know: `GET /prompts/:id/comments` is a separate endpoint (API-04). `GET /prompts/:id` likely returns `comment_count` not inline `comments`.
   - Recommendation: `usePromptDetail` should call `GET /prompts/:id` + `GET /prompts/:id/comments` together (or the single detail endpoint if it embeds comments). Read `src/workers/api/routes/prompts.ts` detail handler to confirm.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x (jsdom environment) |
| Config file | `/Users/davor/development/repo/d-sauer/prompt-community/vitest.config.ts` |
| Quick run command | `npx vitest run src/composables/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FRONT-01 | apiFetch throws on non-2xx, injects credentials | unit | `npx vitest run src/lib/api/http.spec.ts` | ❌ Wave 0 |
| FRONT-02 | getPrompts, getPromptDetail, createPrompt etc. call correct endpoints | unit | `npx vitest run src/lib/api/` | ❌ Wave 0 |
| FRONT-07 | usePromptsQuery imports from @/lib/api/queries | unit | `npx vitest run src/composables/queries/usePromptsQuery.spec.ts` | ❌ Wave 0 |
| FRONT-08 | useReactions, useComments etc. import from @/lib/api/mutations | unit | `npx vitest run src/composables/queries/useReactions.spec.ts` | ✅ (rewrite mock) |
| FRONT-09 | logout() POSTs to /auth/logout | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ✅ (extend) |
| FRONT-10 | No import of @/lib/github/etag in query composables | lint/tsc | `npx tsc --noEmit` | N/A |
| FRONT-11 | useUserActivity uses useInfiniteQuery, maps prompt_created events | unit | `npx vitest run src/composables/queries/useUserActivity.spec.ts` | ❌ Wave 0 |
| SEARCH-03 | buildIndex called with API response data, search returns results | unit | `npx vitest run src/lib/search.spec.ts` | ✅ (existing) |
| SEARCH-04 | SW runtimeCaching matches API URL pattern | manual | `npx vite build && inspect dev-dist/sw.js` | manual |

### Sampling Rate
- **Per task commit:** `npx vitest run src/composables/queries/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/api/http.spec.ts` — covers FRONT-01 (apiFetch error handling, credentials)
- [ ] `src/lib/api/queries.spec.ts` — covers FRONT-02, FRONT-05 (function existence + shape)
- [ ] `src/lib/api/mutations.spec.ts` — covers FRONT-02, FRONT-03, FRONT-04 (function existence + shape)
- [ ] `src/composables/queries/useUserActivity.spec.ts` — covers FRONT-11

## Sources

### Primary (HIGH confidence)
- Direct codebase read — all 23 composable files, all lib files, vite.config.ts, vitest.config.ts, src/types/index.ts, src/workers/api/routes/users.ts, src/workers/api/routes/auth.ts
- `13-CONTEXT.md` — locked decisions from discussion session

### Secondary (MEDIUM confidence)
- TanStack Query v5 `useInfiniteQuery` pattern — verified by existing `usePromptsQuery.ts` implementation
- Workbox `runtimeCaching` configuration — verified by existing `vite.config.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — all patterns are existing patterns in the codebase, not new
- Pitfalls: HIGH — identified by direct code inspection, not theoretical
- Open questions: MEDIUM — logout boundary is ambiguous in CONTEXT.md

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable migration phase; external dependencies don't change)
