# Phase 4: Admin & PWA - Research

**Researched:** 2026-03-24
**Domain:** Vue 3 Admin Panel + PWA (vite-plugin-pwa / Workbox) + GitHub REST & GraphQL API
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin panel layout**
- Tabbed sections within AdminView: Queue | Labels | Log (using existing Tabs component — same pattern as profile page)
- Sticky summary bar above the tabs showing: total prompts, flagged count, featured count (always visible regardless of active tab)
- Moderation queue: table rows with inline action buttons (Approve / Hide / Delete) + bulk checkboxes on left column
- Queue pagination: 20 items per page with prev/next controls

**Moderation action model**
- Approve = remove `flag:review` label from the GitHub Issue (no additional labels added)
- Hide = add `status:hidden` label; Browse query must filter out `status:hidden` items
- Delete = permanently delete the GitHub Issue via GitHub API; requires a confirmation Dialog before executing (hard delete, no recovery)
- Action logging = after each action, post a system comment to the GitHub Issue: e.g. `✓ Approved by @login on 2026-03-24`. This is the moderation log source (ADMN-08 reads these comments).

**Bulk actions**
- Checkboxes select multiple queue items; a bulk action toolbar appears when 1+ items are selected
- Bulk actions: Approve all selected / Hide all selected / Delete all selected
- Bulk delete requires a single confirmation Dialog listing count (e.g. "Delete 3 prompts permanently?")

**Featured prompts (ADMN-07)**
- Feature = add `status:featured` label to a prompt; unfeature = remove it
- Featured toggle available from the moderation queue table row actions (not a separate tab)

**Label management (ADMN-06)**
- Labels tab shows all GitHub labels in the data repo, grouped by namespace prefix
- Namespace prefix enforcement: labels must follow `namespace:value` pattern
- Hard block on save if label doesn't match `namespace:value` format — inline error message, not silent failure

**Moderation log (ADMN-08)**
- Log tab reads system comments from issues (those matching the "✓ [action] by @login on [date]" pattern)
- Filterable by date range
- Shows: timestamp, action taken, prompt title, maintainer who acted

**PWA offline scope**
- Service worker via `vite-plugin-pwa` (already in tech stack, not yet configured)
- Cache strategy: app shell (HTML/JS/CSS) + network-first for API responses, falling back to cache for previously visited prompt pages
- No pre-caching of all prompts — only pages the user has visited are available offline

**PWA write sync queue**
- Queue: `postComment` and `toggleReaction` mutations only (not prompt create/edit/flag)
- Queue stored in localStorage (auth tokens are Pinia-memory-only, so queued items must not contain tokens — re-authenticate on sync)
- On reconnect: drain queue automatically, show Sonner toast for each synced item

**Offline UX**
- Connectivity detection via `VueUse useOnline()`
- On disconnect: Sonner toast "You're offline — showing cached content"
- On reconnect: Sonner toast "Back online — syncing X queued action(s)"
- No persistent banner; toast is sufficient

**PWA install**
- No custom install prompt — browser native install UI only

### Claude's Discretion
- Exact workbox cache strategy configuration (stale-while-revalidate vs. network-first per route)
- Queue drain error handling (failed sync retry logic)
- Exact GitHub API call for reading moderation log comments (filter pattern)
- Label edit/delete confirmation UX (inline row editing vs. Dialog)
- Admin table responsive behavior on smaller screens

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMN-01 | Maintainer/Curator can access admin panel; non-maintainers redirected immediately | Router guard already exists (`meta: { requiresMaintainer: true }` + `verifyMaintainerStatus()` API call). AdminView.vue is a placeholder ready for implementation. |
| ADMN-02 | Maintainer/Curator can view stats overview: total prompts, flagged count, featured count | Requires three GitHub GraphQL queries or label-filtered issue count queries. Sticky stats bar rendered above Tabs component. |
| ADMN-03 | Maintainer/Curator can view moderation queue of flagged prompts | GitHub GraphQL query with `labels: ["flag:review"]` filter, paginated 20/page. Maps to `useAdminQueue` composable. |
| ADMN-04 | Maintainer/Curator can approve, hide, or delete prompts from the moderation queue | Approve = REST `DELETE label`; Hide = REST `POST label`; Delete = **GraphQL `deleteIssue` mutation** (no REST delete issue endpoint exists). Each action posts a system comment. |
| ADMN-05 | Maintainer/Curator can perform bulk actions across multiple queue items | Checkbox selection state in composable, sequential mutation execution per selected item, single confirmation Dialog for bulk delete. |
| ADMN-06 | Maintainer/Curator can add, edit, and delete GitHub labels with namespace enforcement | GitHub REST API: `GET /labels`, `POST /labels`, `PATCH /labels/{name}`, `DELETE /labels/{name}`. Client-side regex validation `^[a-z]+:[a-z0-9-]+$` before save. |
| ADMN-07 | Maintainer/Curator can mark prompts as featured | Toggle `status:featured` label via REST add/remove label on issue. Feature flag visible in queue table row. |
| ADMN-08 | Maintainer/Curator can view moderation log with full action history, filterable by date | GitHub REST `GET /repos/{owner}/{repo}/issues/{number}/comments` per flagged issue; filter client-side by comment body pattern `^✓ ` and optional date range. |
| SHEL-07 | Any user can browse previously cached prompts while offline (PWA service worker cache) | vite-plugin-pwa 1.x with Workbox `runtimeCaching`; NetworkFirst for API routes, StaleWhileRevalidate for app shell and static assets. |
| SHEL-08 | Authenticated user's write actions taken offline are queued for sync when connectivity restores | localStorage-based queue (no tokens stored); VueUse `useOnline()` to detect reconnect; `useOfflineQueue` composable drains queue on reconnect, shows Sonner toast. |
</phase_requirements>

---

## Summary

This phase has two independent workstreams: the admin panel and PWA. The admin panel builds on an existing placeholder (`AdminView.vue`) and follows the project's established mutation composable pattern. The key technical surprise for planning: **GitHub REST API has no endpoint to delete individual issues — deletion requires the GraphQL `deleteIssue` mutation** with the issue's node ID. All other admin operations (label management, adding/removing labels on issues) use the REST API matching existing patterns in `mutations.ts`.

The PWA workstream requires adding `vite-plugin-pwa` (version ~1.2) to `vite.config.ts`. The plugin generates a service worker using Workbox. The correct cache strategy for this project is **NetworkFirst** for GitHub API routes (ensures fresh data when online, falls back to cache offline) and **StaleWhileRevalidate** for the app shell (HTML/JS/CSS). The offline write queue is implemented as a custom `useOfflineQueue` composable backed by localStorage (deliberately not using Workbox BackgroundSync because that would require the service worker to hold credentials, violating INFR-07).

**Primary recommendation:** Build admin panel first (3 composables, 3 sub-components inside AdminView tabs); add PWA as a configuration-heavy but low-code second workstream. The access control guard is already done and tested — do not touch the router guard.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | ^1.2.0 | Service worker generation, PWA manifest injection | Official Vite ecosystem plugin; zero-config baseline, full Workbox integration |
| @vueuse/core | ^14.2.1 (already installed) | `useOnline()` for connectivity detection | Already a project dependency; provides reactive `Readonly<ShallowRef<boolean>>` |
| @tanstack/vue-query | ^5.92.9 (already installed) | `useMutation` + `useQuery` for all admin API calls | Established project pattern for all GitHub mutations |
| vue-sonner | ^2.0.9 (already installed) | Toast notifications for offline/online status and sync feedback | Already used in bookmark guard — identical pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox-window | bundled with vite-plugin-pwa | SW registration lifecycle | Used internally; access via `virtual:pwa-register/vue` if SW update prompts are needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-pwa generateSW | injectManifest custom SW | generateSW is sufficient; injectManifest only needed for custom SW logic beyond what workbox provides |
| localStorage offline queue | Workbox BackgroundSync | BackgroundSync requires service worker to hold tokens, violating INFR-07; localStorage queue with re-auth on drain is the correct approach |
| GraphQL `deleteIssue` | REST DELETE issue | No REST endpoint for issue deletion — GraphQL is the only option |

**Installation:**
```bash
npm install -D vite-plugin-pwa
```

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
src/
├── composables/queries/
│   ├── useAdminQueue.ts          # flagged issues list + pagination
│   ├── useAdminActions.ts        # approve/hide/delete/feature mutations + action log comment
│   ├── useAdminLabels.ts         # list/create/update/delete repo labels
│   ├── useAdminLog.ts            # read moderation log comments from issues
│   ├── useAdminStats.ts          # total/flagged/featured counts
│   └── useOfflineQueue.ts        # localStorage queue + useOnline drain logic
├── lib/github/
│   └── mutations.ts              # add: addLabel, removeLabel, deleteIssueGraphQL, postModerationComment
├── components/admin/
│   ├── AdminStatsBar.vue         # sticky total/flagged/featured counts
│   ├── AdminQueueTab.vue         # table with checkboxes, inline actions, pagination
│   ├── AdminLabelsTab.vue        # label list grouped by namespace, inline form
│   └── AdminLogTab.vue           # log entries table with date filter
└── views/
    └── AdminView.vue             # tabs orchestrator (Queue | Labels | Log) + AdminStatsBar
```

### Pattern 1: Admin Mutation Composable (follows useFlagPrompt shape)

**What:** Each admin action is a `useMutation` composable in `useAdminActions.ts` that calls a GitHub function, posts a system comment, then invalidates the queue query cache.
**When to use:** Any write action in the admin panel.

```typescript
// Source: established project pattern (useFlagPrompt.ts + mutations.ts)
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { removeLabel, addLabel, postModerationComment } from '@/lib/github/mutations'

export function useAdminActions() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  const approveMutation = useMutation({
    mutationFn: async (issueNumber: number) => {
      await removeLabel(authStore.token!, issueNumber, 'flag:review')
      await postModerationComment(authStore.token!, issueNumber, 'Approved')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })

  // deleteMutation calls deleteIssueGraphQL (GraphQL mutation — NOT REST)
  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await deleteIssueGraphQL(authStore.token!, nodeId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })

  return { approveMutation, deleteMutation /* ... */ }
}
```

### Pattern 2: PWA vite.config.ts Configuration

**What:** VitePWA plugin with Workbox runtimeCaching matching this project's GitHub API routing.
**When to use:** Single addition to `vite.config.ts`.

```typescript
// Source: vite-pwa-org.netlify.app/workbox/generate-sw (verified)
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Prompt Community',
    short_name: 'Prompts',
    theme_color: '#000000',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  workbox: {
    // App shell: stale-while-revalidate (serve cached, refresh in background)
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.github\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'github-api-cache',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})
```

### Pattern 3: Offline Queue Composable

**What:** Persistent action queue in localStorage; drains on reconnect using `useOnline()`.
**When to use:** `postComment` and `toggleReaction` mutations triggered while offline.

```typescript
// Source: established project pattern (useBookmarksStore.ts localStorage) + VueUse useOnline
import { useOnline } from '@vueuse/core'
import { watch } from 'vue'
import { toast } from 'vue-sonner'

interface QueuedAction {
  type: 'postComment' | 'toggleReaction'
  issueNumber: number
  payload: Record<string, unknown>  // no token — re-authenticate on drain
}

const QUEUE_KEY = 'offline_action_queue'

export function useOfflineQueue() {
  const isOnline = useOnline()

  function enqueue(action: QueuedAction) {
    const queue = getQueue()
    queue.push(action)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }

  function getQueue(): QueuedAction[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  async function drainQueue(token: string) {
    const queue = getQueue()
    if (queue.length === 0) return
    // process each item ...
    localStorage.removeItem(QUEUE_KEY)
    toast(`Back online — synced ${queue.length} queued action(s)`)
  }

  watch(isOnline, (online) => {
    if (!online) {
      toast("You're offline — showing cached content")
    }
    // Drain handled by caller once re-auth confirmed
  })

  return { enqueue, getQueue, drainQueue, isOnline }
}
```

### Pattern 4: GraphQL deleteIssue Mutation

**What:** Only way to hard-delete a GitHub issue. Uses the issue's `nodeId` (GraphQL global ID), not the issue number.
**When to use:** Admin "Delete" action from the moderation queue.

```typescript
// Source: GitHub GraphQL docs (docs.github.com/en/graphql/reference/mutations#deleteissue)
const DELETE_ISSUE = `
  mutation DeleteIssue($issueId: ID!) {
    deleteIssue(input: { issueId: $issueId }) {
      repository { id }
    }
  }
`

export async function deleteIssueGraphQL(token: string, nodeId: string): Promise<void> {
  const client = createGraphqlClient(token)
  await client(DELETE_ISSUE, { issueId: nodeId })
}
```

Note: The issue `nodeId` must come from the GraphQL query that fetches the queue — ensure `GET_FLAGGED_ISSUES` query includes `id` field (the global node ID), which existing `GET_PROMPT_DETAIL` already does.

### Anti-Patterns to Avoid

- **Using REST to delete issues:** `DELETE /repos/{owner}/{repo}/issues/{number}` does not exist. GitHub REST API cannot delete individual issues. Always use the GraphQL `deleteIssue` mutation.
- **Storing tokens in the offline queue:** Auth tokens are Pinia memory-only (INFR-07). Queue items must store only the action type and public parameters; re-authenticate on drain.
- **Pre-caching all prompts:** The decision is explicit — only cache visited pages. Do not add `globPatterns` or `additionalManifestEntries` that would pre-cache all issue content.
- **Client-side-only admin guard:** The router guard already calls `verifyMaintainerStatus()` (GitHub API) on every admin navigation. Never bypass this with a local `isMaintainer` flag check alone.
- **Fetching moderation log by scanning all issues:** Query only flagged/hidden/featured issues and read their comments. Do not fetch all issues and scan comments — rate limit cost is too high.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker generation | Custom SW file with fetch events | vite-plugin-pwa Workbox `generateSW` | Workbox handles cache versioning, precache manifest, stale cleanup — 200+ edge cases |
| Connectivity reactive state | `window.addEventListener('online')` wrapper | `useOnline()` from @vueuse/core | Already installed; handles SSR, cleanup, and ShallowRef reactivity correctly |
| Label namespace validation regex | Ad-hoc string split | `/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/` pattern with inline error | Simple regex; validate in the composable before the API call |
| Offline queue persistence | Custom storage class | Direct `localStorage.getItem/setItem` with JSON parse (same as useBookmarksStore) | No third-party queue library needed; the queue is trivially small (postComment + toggleReaction only) |

**Key insight:** PWA cache management has many edge cases around stale manifests, cache invalidation on deploy, and partial update scenarios. Workbox (via vite-plugin-pwa) handles all of them. The offline write queue is deliberately simple (only 2 action types, no retry complexity beyond one attempt) — do not over-engineer it.

## Common Pitfalls

### Pitfall 1: deleteIssue requires nodeId, not issue number

**What goes wrong:** Calling `deleteIssueGraphQL` with `issue.number` (an integer like `42`) instead of `issue.id` (a base64 GraphQL node ID like `I_kwDO...`).
**Why it happens:** REST API uses issue numbers; GraphQL uses node IDs. The existing `GET_PROMPTS` query does NOT include the `id` field — only the queue query for the admin panel must add it.
**How to avoid:** Ensure `GET_FLAGGED_ISSUES` GraphQL query explicitly requests `id` on each issue node. Verify node ID is passed through to the delete mutation.
**Warning signs:** GraphQL returns "Could not resolve to an Issue with the nodeId..." error.

### Pitfall 2: vite-plugin-pwa and Vite 8 peer dependency

**What goes wrong:** `npm install -D vite-plugin-pwa` may trigger a peer dependency warning because vite-plugin-pwa 1.2 peer dep declaration may not yet list Vite 8 explicitly.
**Why it happens:** The project uses Vite 8 (latest); vite-plugin-pwa 1.2 last explicitly declared Vite 7 support in its changelog (November 2025). Vite 8 is backward-compatible, but peer dep ranges may lag.
**How to avoid:** The project already has `legacy-peer-deps=true` in `.npmrc` — this resolves the issue without any manual override needed. The plugin works in practice with Vite 8.
**Warning signs:** Installation warnings about peer dependency resolution. Resolve with `--legacy-peer-deps` (already set in `.npmrc`).

### Pitfall 3: PWA manifest icons are required for installability

**What goes wrong:** App is served with a service worker but the browser does not offer the install prompt because the PWA manifest is missing icons or the `icons` array lacks a 192x192 and 512x512 entry.
**Why it happens:** PWA installability criteria require at least one `purpose: 'any'` icon ≥ 192px.
**How to avoid:** Create two PNG icon files (`public/pwa-192.png`, `public/pwa-512.png`) before or during the vite.config.ts configuration task. The decision is native-only install prompt (no custom UI), so this is the only installability gate.
**Warning signs:** Chrome DevTools Application tab shows "Page does not meet installability criteria."

### Pitfall 4: Moderation log comment pattern must exclude version comments

**What goes wrong:** Log query returns version comments (`## Version N — YYYY-MM-DD`) along with moderation system comments because both are posted on the same issues.
**Why it happens:** All comments on an issue are returned by the GitHub API; the two formats share the same comment thread.
**How to avoid:** Filter comments client-side: only include those whose body matches `/^✓ (Approved|Hidden|Deleted) by @/`. Version comments start with `## Version`, community comments do not start with `✓`.
**Warning signs:** Moderation log shows version history entries as moderation actions.

### Pitfall 5: Stats bar total count is expensive

**What goes wrong:** Fetching `totalCount` for all prompts as a separate API call on every admin load, burning rate limit.
**Why it happens:** `GET_PROMPTS` returns paginated data; total count needs a separate aggregation.
**How to avoid:** Use GitHub GraphQL `repository.issues(states: [OPEN]) { totalCount }` with label filters in one query returning all three counts simultaneously (`total`, `flag:review`, `status:featured`). A single GraphQL query can return all three counts.
**Warning signs:** Multiple API calls on admin load in network tab.

## Code Examples

Verified patterns from official sources:

### GitHub REST: Add label to issue
```typescript
// Source: existing mutations.ts flagPrompt pattern (project codebase)
await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
  owner: owner(),
  repo: repo(),
  issue_number: issueNumber,
  labels: ['status:hidden'],
  headers: { 'X-GitHub-Api-Version': '2022-11-28' },
})
```

### GitHub REST: Remove label from issue
```typescript
// Source: docs.github.com/en/rest/issues/labels
await octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}', {
  owner: owner(),
  repo: repo(),
  issue_number: issueNumber,
  name: 'flag:review',
  headers: { 'X-GitHub-Api-Version': '2022-11-28' },
})
```

### GitHub REST: List all repo labels
```typescript
// Source: docs.github.com/en/rest/issues/labels
const response = await octokit.request('GET /repos/{owner}/{repo}/labels', {
  owner: owner(),
  repo: repo(),
  per_page: 100,
  headers: { 'X-GitHub-Api-Version': '2022-11-28' },
})
// response.data: Array<{ id, node_id, url, name, color, default, description }>
```

### GitHub REST: Create label
```typescript
// Source: docs.github.com/en/rest/issues/labels
await octokit.request('POST /repos/{owner}/{repo}/labels', {
  owner: owner(),
  repo: repo(),
  name: 'category:engineering',
  color: '0075ca',  // hex without #
  description: 'Engineering prompts',
  headers: { 'X-GitHub-Api-Version': '2022-11-28' },
})
```

### GitHub REST: Update label
```typescript
// Source: docs.github.com/en/rest/issues/labels
await octokit.request('PATCH /repos/{owner}/{repo}/labels/{name}', {
  owner: owner(),
  repo: repo(),
  name: 'old-name',
  new_name: 'category:new-name',
  color: '0075ca',
  headers: { 'X-GitHub-Api-Version': '2022-11-28' },
})
```

### GitHub REST: Delete label
```typescript
// Source: docs.github.com/en/rest/issues/labels
await octokit.request('DELETE /repos/{owner}/{repo}/labels/{name}', {
  owner: owner(),
  repo: repo(),
  name: 'old-label',
  headers: { 'X-GitHub-Api-Version': '2022-11-28' },
})
```

### GitHub GraphQL: deleteIssue mutation
```typescript
// Source: docs.github.com/en/graphql/reference/mutations#deleteissue
const DELETE_ISSUE = `
  mutation DeleteIssue($issueId: ID!) {
    deleteIssue(input: { issueId: $issueId }) {
      repository { id }
    }
  }
`
// issueId must be the GraphQL node ID (issue.id from GraphQL query), NOT the issue number
```

### GitHub GraphQL: Flagged issues query with nodeId
```typescript
// Source: existing GET_PROMPTS pattern with added id field (src/lib/github/queries.ts)
const GET_FLAGGED_ISSUES = `
  query GetFlaggedIssues($owner: String!, $repo: String!, $after: String) {
    repository(owner: $owner, name: $repo) {
      flagged: issues(first: 20, after: $after, states: [OPEN], labels: ["flag:review"]) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id        # GraphQL node ID — required for deleteIssue mutation
          number
          title
          createdAt
          author { login avatarUrl }
          labels(first: 10) { nodes { name color } }
        }
      }
    }
  }
`
```

### GitHub GraphQL: Admin stats (single query, three counts)
```typescript
// Source: GitHub GraphQL docs — multiple issue count aliases in one query
const GET_ADMIN_STATS = `
  query GetAdminStats($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      total: issues(states: [OPEN]) { totalCount }
      flagged: issues(states: [OPEN], labels: ["flag:review"]) { totalCount }
      featured: issues(states: [OPEN], labels: ["status:featured"]) { totalCount }
    }
  }
`
```

### vite-plugin-pwa minimal config for this project
```typescript
// Source: vite-pwa-org.netlify.app/workbox/generate-sw
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Prompt Community',
    short_name: 'Prompts',
    theme_color: '#000000',
    background_color: '#000000',
    display: 'standalone',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  workbox: {
    navigateFallback: 'index.html',
    runtimeCaching: [
      {
        // GitHub API — network first, cache as fallback for offline
        urlPattern: /^https:\/\/api\.github\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'github-api-cache',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // GitHub avatars — stale-while-revalidate (images can be slightly stale)
        urlPattern: /^https:\/\/avatars\.githubusercontent\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'github-avatars-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 86400 * 7 },
        },
      },
    ],
  },
})
```

### useOnline from VueUse
```typescript
// Source: vueuse.org/core/useonline/ (verified)
import { useOnline } from '@vueuse/core'

const isOnline = useOnline()
// isOnline: Readonly<ShallowRef<boolean>>
// Reactively updates on browser online/offline events
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual service worker with fetch event | vite-plugin-pwa + Workbox generateSW | ~2020 (Workbox v5+) | Eliminates manual cache versioning |
| Workbox BackgroundSync for offline mutations | Custom localStorage queue (for token-sensitive apps) | Architectural choice | BackgroundSync can't hold OAuth tokens safely; custom queue is correct pattern here |
| REST API issue close/lock as "soft delete" | GraphQL `deleteIssue` for hard delete | GitHub GraphQL API (2019+) | Only GraphQL supports hard issue deletion |

**Deprecated/outdated:**
- `workbox-webpack-plugin`: webpack-specific — this is a Vite project, use vite-plugin-pwa exclusively
- Manual `navigator.onLine` event listener wrappers: replaced by `useOnline()` from @vueuse/core

## Open Questions

1. **Label namespace conventions in the data repo**
   - What we know: Labels must follow `namespace:value` pattern; known namespaces include `category:`, `model:`, `status:`, `flag:`, `type:`
   - What's unclear: The exact current set of labels in the GitHub data repo (the CONTEXT.md says "Claude's discretion: which specific namespaces exist")
   - Recommendation: The planner should add a Wave 0 task to `GET /repos/{owner}/{repo}/labels` and document the discovered namespaces. The label validation regex `^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$` works regardless of specific namespaces.

2. **Retry logic for failed offline sync drain**
   - What we know: The queue drains on reconnect; no retry requirement specified
   - What's unclear: Should failed individual actions be re-queued, or silently dropped?
   - Recommendation: On drain failure, show Sonner error toast "Failed to sync X action(s) — please retry manually" and clear the queue. Do not re-queue (avoids duplicate actions). Simple is correct here.

3. **vite-plugin-pwa compatibility with Vite 8 peerDeps**
   - What we know: The project uses Vite 8 (^8.0.0); vite-plugin-pwa 1.2 peer dep may not explicitly list Vite 8; `.npmrc` has `legacy-peer-deps=true`
   - What's unclear: Whether vite-plugin-pwa has been tested on Vite 8's Rolldown bundler
   - Recommendation: Install and verify service worker generates correctly in dev mode (`devOptions: { enabled: true }`). If issues arise, pin to a known-working config or file a bug. HIGH probability of working given Vite 8 backward compatibility commitment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMN-01 | Non-maintainer redirected; maintainer verified via GitHub API | unit | `npx vitest run src/router/index.spec.ts -t "admin"` | ❌ Wave 0 (existing auth.spec.ts covers verifyMaintainerStatus but not the router guard path) |
| ADMN-02 | Stats bar shows correct total/flagged/featured counts | unit | `npx vitest run src/composables/queries/useAdminStats.spec.ts` | ❌ Wave 0 |
| ADMN-03 | Queue fetches issues labeled flag:review, paginated 20/page | unit | `npx vitest run src/composables/queries/useAdminQueue.spec.ts` | ❌ Wave 0 |
| ADMN-04 | Approve removes flag:review; Hide adds status:hidden; Delete calls deleteIssue GraphQL | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts` | ❌ Wave 0 |
| ADMN-04 | System comment posted after each action | unit | (same spec) | ❌ Wave 0 |
| ADMN-05 | Bulk action iterates over all selected items; bulk delete shows count in dialog | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts -t "bulk"` | ❌ Wave 0 |
| ADMN-06 | Label namespace validation blocks non-`namespace:value` format inline | unit | `npx vitest run src/composables/queries/useAdminLabels.spec.ts` | ❌ Wave 0 |
| ADMN-07 | Feature toggle adds/removes status:featured label | unit | (covered in useAdminActions.spec.ts) | ❌ Wave 0 |
| ADMN-08 | Log filters comments matching `^✓` pattern by date range | unit | `npx vitest run src/composables/queries/useAdminLog.spec.ts` | ❌ Wave 0 |
| SHEL-07 | Service worker registered; NetworkFirst cache for API routes | manual-only | Manual: Chrome DevTools Application tab → Service Workers | N/A |
| SHEL-08 | Offline queue stores actions; drains on reconnect; no token in queue | unit | `npx vitest run src/composables/queries/useOfflineQueue.spec.ts` | ❌ Wave 0 |
| SHEL-08 | Token never written to localStorage in queue | unit | (same spec — spy on Storage.prototype.setItem) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/composables/queries/useAdmin*.spec.ts src/composables/queries/useOfflineQueue.spec.ts`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/composables/queries/useAdminStats.spec.ts` — covers ADMN-02 (mock GraphQL, assert counts)
- [ ] `src/composables/queries/useAdminQueue.spec.ts` — covers ADMN-03 (mock paginated flag:review results)
- [ ] `src/composables/queries/useAdminActions.spec.ts` — covers ADMN-04, ADMN-05, ADMN-07 (mock removeLabel, addLabel, deleteIssueGraphQL, postModerationComment)
- [ ] `src/composables/queries/useAdminLabels.spec.ts` — covers ADMN-06 (namespace validation regex tests + mock REST label CRUD)
- [ ] `src/composables/queries/useAdminLog.spec.ts` — covers ADMN-08 (comment filter pattern, date range filter)
- [ ] `src/composables/queries/useOfflineQueue.spec.ts` — covers SHEL-08 (queue localStorage persistence, drain logic, no token assertion)
- [ ] `src/lib/github/mutations.ts` — add `addLabel`, `removeLabel`, `deleteIssueGraphQL`, `postModerationComment` functions; covered by existing mock in useFlagPrompt.spec.ts pattern

## Sources

### Primary (HIGH confidence)
- Official GitHub Docs REST API (docs.github.com/en/rest/issues/labels) — label CRUD endpoints, exact method/path/params
- Official GitHub GraphQL Docs (docs.github.com/en/graphql/reference/mutations#deleteissue) — deleteIssue mutation signature
- vite-pwa official docs (vite-pwa-org.netlify.app/workbox/generate-sw) — runtimeCaching configuration shape
- VueUse official docs (vueuse.org/core/useonline/) — useOnline return type and import path
- Project source code (src/lib/github/mutations.ts, src/composables/queries/useFlagPrompt.ts, src/router/index.ts) — established patterns for mutations, guards, composable shape

### Secondary (MEDIUM confidence)
- GitHub Community Discussion #39520 (github.com/orgs/community/discussions/39520) — confirms no REST endpoint for issue deletion; GraphQL only
- vite-plugin-pwa GitHub releases page (github.com/vite-pwa/vite-plugin-pwa/releases) — v1.2.0 latest, Vite 7 explicitly listed; Vite 8 backward-compatible per Vite 8 release announcement

### Tertiary (LOW confidence)
- Medium article "Build a Blazing-Fast, Offline-First PWA with Vue 3 and Vite in 2025" — general configuration patterns, superseded by official docs for this research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are either already installed or official Vite ecosystem plugins with published docs
- Architecture: HIGH — directly extends established project mutation/composable patterns; GraphQL deleteIssue verified against official docs
- Pitfalls: HIGH — GitHub REST/GraphQL issue delete limitation verified with official community discussion + GraphQL docs

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (stable ecosystem; GitHub API rarely changes)
