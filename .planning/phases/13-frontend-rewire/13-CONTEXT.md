# Phase 13: Frontend Rewire - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace every `src/lib/github/*` import in composables with `src/lib/api/*`. Delete the ETag layer (`src/lib/github/etag.ts`). Wire the Activity tab to live data from `/users/:login/activity`. Rebuild MiniSearch index from API responses. No changes to any UI component.

**Already done (Phase 10):** Auth store reads identity from `/me`; `isMaintainer` derived from `role` field. Success criterion 2 is already met.

**Out of scope:**
- Any new API endpoints or backend changes
- Deleting v1 github lib files (Phase 15)
- Admin panel rewire (Phase 14)

</domain>

<decisions>
## Implementation Decisions

### Activity Tab
- Show `prompt_created` events only — no comments/reactions (API already returns this, no backend changes needed)
- Display as simple list: "Published [title] — [relative date]" — matches existing Submitted tab style, no new components
- Visible on own profile only — keep existing `isOwnProfile` gate, no change to ProfileTabs.vue logic
- Infinite scroll pagination — auto-load more as user scrolls, consistent with main prompt feed; use `useInfiniteQuery` with cursor-based pagination (`?cursor=&limit=20`)

### Offline Queue
- Update to cookie-based API — swap GitHub token calls to `src/lib/api/*` equivalents; cookie is automatically sent with `credentials: 'include'`, no token parameter needed
- Clear stale v1 queue on first drain — on mount/online, detect integer IDs in the queue and flush them before draining (one-time migration guard)
- Rename `QueuedAction.issueNumber: number` → `QueuedAction.promptId: string` to align with ULID-based IDs

### Spec Files
- Rewrite all ~15 composable specs with new mocks — swap mocked module path from `src/lib/github/*` to `src/lib/api/*`
- Keep `vi.mock()` per function — consistent with existing spec style, no MSW setup required

### API Client Shape (`src/lib/api/*`)
- Structure: `queries.ts` + `mutations.ts` — mirrors existing `src/lib/github/queries.ts` and `mutations.ts`; composables do a 1:1 import-path swap
- Shared fetch helper: `src/lib/api/http.ts` — `apiFetch(path, options)` wrapper handles base URL (`VITE_API_URL`) and `credentials: 'include'`; both queries.ts and mutations.ts import it
- Error handling: throw on non-2xx, parse JSON error body — throws `Error` with message from `{ error: string, code: string }` response shape; TanStack Query catches it via `isError`

### Claude's Discretion
- Exact `apiFetch` TypeScript signature and generic type parameters
- How the MiniSearch `buildIndex` call is triggered after the prompt list query resolves
- Service worker cache rule configuration for API responses
- Exact relative date formatting (e.g., date-fns, Intl.RelativeTimeFormat, or existing utility)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAuthStore.ts`: Already migrated — `fetchMe()` uses `/me`, `isMaintainer` from `role`. No changes needed.
- `useSearchStore.ts`: `buildIndex(prompts)` is the entry point — just needs to be called with API response data
- `ProfileTabs.vue`: Activity tab already exists (rendered for `isOwnProfile`) with "coming soon" placeholder — wire it to a new `useUserActivity` composable
- `useInfiniteQuery` (TanStack Query): Already used in `usePromptsQuery.ts` — reuse the same pattern for Activity infinite scroll

### Established Patterns
- All composables use TanStack Query (`useQuery` / `useInfiniteQuery` / `useMutation`) — keep this pattern
- `vi.mock()` per module is the established spec pattern — replicate for new API mocks
- Cursor-based pagination: `?cursor=<last_ulid>&limit=20`, response `{ data: [...], next_cursor: string | null }` (Phase 11 decision)

### Integration Points
- `src/lib/api/http.ts` → imported by `queries.ts` and `mutations.ts`
- `src/lib/api/queries.ts` → replaces `src/lib/github/queries.ts` in all query composables
- `src/lib/api/mutations.ts` → replaces `src/lib/github/mutations.ts` in all mutation composables
- `useOfflineQueue.ts` → import from `src/lib/api/mutations.ts` instead of `src/lib/github/mutations.ts`
- `ProfileTabs.vue` → new `useUserActivity` composable wired to Activity tab
- `useSearchStore.buildIndex` → called after `usePromptsQuery` data resolves

</code_context>

<specifics>
## Specific Ideas

- The Activity tab display should look and feel like the existing Submitted tab — same font, same list style, just different data
- Infinite scroll on Activity is consistent with the main prompt feed (`useInfiniteQuery`)
- The `apiFetch` wrapper should keep it minimal — just base URL + credentials, not a full interceptor framework

</specifics>

<deferred>
## Deferred Ideas

- Richer activity feed (comments made, reactions received) — would require new activity_log table; future phase
- MSW for integration-level HTTP mocking — could be added as a test improvement in Phase 15
- Logout endpoint (`POST /auth/logout`) — noted in Phase 10 auth store comment as deferred to Phase 13; should be included in scope (wire the `logout()` store method to call the endpoint)

</deferred>

---

*Phase: 13-frontend-rewire*
*Context gathered: 2026-05-08*
