# Phase 7: Wire ETag Caching - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate `etagFetchWrapper` (already implemented in `src/lib/github/etag.ts`) into the Octokit REST client factory so all cacheable GitHub REST API reads send `If-None-Match` headers. 304 responses consume zero rate-limit quota (INFR-05).

What is NOT in scope: new API endpoints, GraphQL ETag caching, new composables.

</domain>

<decisions>
## Implementation Decisions

### ETag cache persistence
- ETags stored in **localStorage** (not in-memory Map only) so conditional requests activate immediately on return visits — no full fetch needed after a page reload
- Cache is **scoped per GitHub login** — localStorage key includes the user's login (e.g., `etag:davor:/repos/owner/repo/labels`) so different accounts on the same browser have isolated caches
- **Cap at 50 entries** — LRU eviction or simple size cap. At ~100 bytes per entry this is ~5KB; prevents unbounded growth over many browsing sessions

### Request scope
- Apply ETag caching to **REST API reads only** (via `createRestClient`) — labels list and issue comments
- GraphQL reads (`usePromptsQuery`, `usePromptDetail`, etc.) rely on TanStack Query `staleTime` for freshness — GitHub's GraphQL endpoint is a POST and ETags are not reliable there
- Future REST calls added through `createRestClient` automatically benefit with no additional wiring

### Write-side invalidation
- **Label mutations clear the labels ETag**: `addLabel`, `updateLabel`, `deleteLabel` call `clearEtag` for the labels REST endpoint after completing, so the next read fetches fresh data rather than trusting a 304 with stale label data
- **Sign-out clears all ETags**: when the user signs out, all entries in their user-scoped ETag localStorage prefix are cleared — prevents stale authenticated-session ETags from leaking to the next user on a shared browser
- Claude determines which other mutations (if any) need ETag clearing based on mutation-to-endpoint mapping

### Claude's Discretion
- Exact localStorage key format and prefix scheme
- LRU implementation details for the 50-entry cap
- Whether to update `etag.ts` in place or create a new `etagStorage.ts` module
- How to pass user login into the key scheme (from authStore or as a parameter)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/github/etag.ts`: `etagFetchWrapper(url, options, cacheKey)` — already implemented, wraps `fetch()` with If-None-Match header injection and ETag capture. `getEtag/setEtag/clearEtag` use an in-memory Map — these will be swapped for localStorage-backed equivalents
- `createRestClient(token)` in `src/lib/github/octokit.ts` — returns `new Octokit({ auth: token })`. Octokit accepts a custom `request.fetch` option to override the underlying fetch function
- `useAuthStore` — holds `token` and `user.login`; accessible in the factory or passed as a parameter for user-scoped key construction

### Established Patterns
- Label mutations live in `src/lib/github/mutations.ts` — `addLabel`, `updateLabel`, `deleteLabel` already imported by admin composables
- TanStack Query mutation `onSuccess` callbacks call `queryClient.invalidateQueries` — `clearEtag` calls can be added here in the same pattern
- Sign-out is handled in `useAuthStore` — the sign-out action is the natural place to clear user-scoped ETags

### Integration Points
- `src/lib/github/octokit.ts` `createRestClient`: pass `etagFetchWrapper` (or a bound wrapper) as Octokit's fetch adapter
- `src/lib/github/mutations.ts` label mutation functions: add `clearEtag(labelsKey)` after successful API call
- `useAuthStore` sign-out action: add user-scoped ETag localStorage purge

</code_context>

<specifics>
## Specific Ideas

No specific UX references — this is an infrastructure phase with no visible UI changes. The only observable effect is reduced GitHub API rate-limit consumption on repeat visits.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-wire-etag-caching*
*Context gathered: 2026-03-26*
